// oxlint-disable no-bitwise
// oxlint-disable no-continue
/* eslint-disable no-console, class-methods-use-this */
import type { TaskDef, TaskHubOptions, TaskSnapshot, TaskState } from '../types';

const DEFAULT_TICK_INTERVAL = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_RETRY_DELAY = 1000;

/**
 * 协作式任务调度中枢
 *
 * 核心思路：一个心跳 + 一个任务注册表 + 依赖关系声明 - init 任务：依赖满足后执行一次 - periodic 任务：依赖满足后按 interval 周期执行 - listener 任务：依赖满足后注册一次，stop 时自动
 * cleanup
 *
 * 零框架依赖，Web / React Native / Node 均可使用
 */
class TaskHub {
  private tasks = new Map<string, TaskState>();
  /** 按 priority 升序维护，避免每次 tick 重新排序 */
  private sortedTasks: TaskState[] = [];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private readyFired = false;
  /** Init 任务总数 / 已完成数，O(1) checkReady */
  private initTaskTotal = 0;
  private initTaskDone = 0;

  private readonly tickInterval: number;
  private readonly maxRetries: number;
  private readonly baseRetryDelay: number;
  private readonly onTaskError?: (taskName: string, error: unknown) => void;
  private readonly onTaskBlocked?: (taskName: string, blockedBy: string) => void;
  private readonly onReady?: () => void;

  constructor(options: TaskHubOptions = {}) {
    this.tickInterval = options.tickInterval ?? DEFAULT_TICK_INTERVAL;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseRetryDelay = options.baseRetryDelay ?? DEFAULT_BASE_RETRY_DELAY;
    this.onTaskError = options.onTaskError;
    this.onTaskBlocked = options.onTaskBlocked;
    this.onReady = options.onReady;
  }

  /** 注册任务，支持链式调用 */
  register(def: TaskDef): this {
    if (this.tasks.has(def.name)) {
      console.warn(`[TaskHub] Task "${def.name}" already registered, skipping.`);
      return this;
    }

    this.validateDef(def);

    const state: TaskState = {
      def: { priority: 10, deps: [], ...def },
      status: 'pending',
      lastRun: 0,
      retryCount: 0
    };

    this.tasks.set(def.name, state);
    this.insertSorted(state);

    if (def.type === 'init') this.initTaskTotal += 1;

    return this;
  }

  /** 批量注册 */
  registerAll(defs: TaskDef[]): this {
    for (const def of defs) {
      this.register(def);
    }
    return this;
  }

  /** 运行时动态追加任务 */
  add(def: TaskDef): this {
    return this.register(def);
  }

  /** 运行时移除任务（会调用 cleanup） */
  remove(name: string): boolean {
    const task = this.tasks.get(name);
    if (!task) return false;

    task.def.cleanup?.();
    this.tasks.delete(name);

    const idx = this.sortedTasks.indexOf(task);
    if (idx !== -1) this.sortedTasks.splice(idx, 1);

    if (task.def.type === 'init') {
      this.initTaskTotal -= 1;
      if (task.status === 'done') this.initTaskDone -= 1;
    }

    return true;
  }

  /** 启动调度 */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.tick();
    this.tickTimer = setInterval(() => this.tick(), this.tickInterval);
  }

  /** 停止调度并清理所有任务 */
  stop(): void {
    if (!this.started) return;

    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    // 逆优先级顺序清理（数组末尾 = priority 数字大 = 低优先级，先清理）
    for (let i = this.sortedTasks.length - 1; i >= 0; i -= 1) {
      this.sortedTasks[i].def.cleanup?.();
    }

    this.tasks.clear();
    this.sortedTasks = [];
    this.initTaskTotal = 0;
    this.initTaskDone = 0;
    this.started = false;
    this.readyFired = false;
  }

  /** 暂停调度（不清理任务，可 resume 恢复） */
  pause(): void {
    if (!this.started || !this.tickTimer) return;
    clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  /** 恢复调度 */
  resume(): void {
    if (!this.started || this.tickTimer) return;
    this.tickTimer = setInterval(() => this.tick(), this.tickInterval);
  }

  /** 是否正在运行 */
  get running(): boolean {
    return this.started && this.tickTimer !== null;
  }

  /** 获取全部任务快照（调试用） */
  snapshot(): TaskSnapshot[] {
    return this.sortedTasks.map(task => this.toSnapshot(task));
  }

  /** 获取单个任务状态 */
  getTask(name: string): TaskSnapshot | undefined {
    const task = this.tasks.get(name);
    return task ? this.toSnapshot(task) : undefined;
  }

  /** 单次心跳：遍历任务表，调度满足条件的任务 */
  private tick(): void {
    const now = Date.now();

    for (const task of this.sortedTasks) {
      switch (task.def.type) {
        case 'init':
        case 'listener':
          this.tickOneShot(task);
          break;
        case 'periodic':
          this.tickPeriodic(task, now);
          break;
        default:
          break;
      }
    }

    this.checkReady();
  }

  /** Init / Listener 共用调度：依赖满足 + 待执行 → 执行一次 */
  private tickOneShot(task: TaskState): void {
    if (task.status === 'done' || task.status === 'running' || task.status === 'blocked') return;

    if (task.status === 'failed') {
      if (!this.canRetry(task)) return;
      if (!this.retryDelayElapsed(task)) return;
    }

    if (!this.depsResolved(task)) return;

    this.execute(task);
  }

  /** Periodic 任务调度：依赖满足 + 间隔到了 → 再次执行 */
  private tickPeriodic(task: TaskState, now: number): void {
    if (task.status === 'running') return;
    if (!this.depsResolved(task)) return;

    const interval = task.def.interval ?? 5000;

    if (now - task.lastRun >= interval) {
      this.execute(task);
    }
  }

  /** 检查依赖是否全部完成 */
  private depsResolved(task: TaskState): boolean {
    const deps = task.def.deps ?? [];
    return deps.every(depName => this.tasks.get(depName)?.status === 'done');
  }

  /** 是否还有重试机会 */
  private canRetry(task: TaskState): boolean {
    return this.maxRetries > 0 && task.retryCount < this.maxRetries;
  }

  /** 重试延迟是否已到（指数退避） */
  private retryDelayElapsed(task: TaskState): boolean {
    const delay = this.baseRetryDelay * 2 ** task.retryCount;
    return Date.now() - task.lastRun >= delay;
  }

  /** 执行单个任务 */
  private async execute(task: TaskState): Promise<void> {
    task.status = 'running';
    task.error = undefined;

    try {
      await task.def.run();
      task.lastRun = Date.now();
      task.status = 'done';
      task.retryCount = 0;

      if (task.def.type === 'init') this.initTaskDone += 1;
    } catch (err) {
      task.lastRun = Date.now();
      task.retryCount += 1;
      task.status = 'failed';
      task.error = err;
      this.onTaskError?.(task.def.name, err);

      // periodic 天然在下个周期重试，不参与 blocked 传播
      if (task.def.type !== 'periodic' && !this.canRetry(task)) {
        this.propagateBlocked(task.def.name);
      }
    }
  }

  /** 全部 init 任务完成时触发 onReady */
  private checkReady(): void {
    if (this.readyFired || !this.onReady || this.initTaskTotal === 0) return;
    if (this.initTaskDone === this.initTaskTotal) {
      this.readyFired = true;
      this.onReady();
    }
  }

  /** 上游永久失败后，BFS 级联标记下游为 blocked */
  private propagateBlocked(failedName: string): void {
    const queue = [failedName];

    while (queue.length > 0) {
      const blockedBy = queue.shift()!;
      for (const task of this.sortedTasks) {
        if (task.status !== 'pending' && task.status !== 'failed') continue;
        if ((task.def.deps ?? []).includes(blockedBy)) {
          task.status = 'blocked';
          this.onTaskBlocked?.(task.def.name, blockedBy);
          queue.push(task.def.name);
        }
      }
    }
  }

  /** 校验任务定义（含循环依赖检测） */
  private validateDef(def: TaskDef): void {
    if (!def.name) throw new Error('[TaskHub] Task name is required.');
    if (!def.run) throw new Error(`[TaskHub] Task "${def.name}" must have a run function.`);
    if (def.type === 'periodic' && def.interval !== undefined && def.interval <= 0) {
      throw new Error(`[TaskHub] Task "${def.name}" interval must be positive.`);
    }

    for (const dep of def.deps ?? []) {
      if (dep === def.name) {
        throw new Error(`[TaskHub] Task "${def.name}" cannot depend on itself.`);
      }
    }

    if (this.hasCycle(def.name, def.deps ?? [])) {
      throw new Error(`[TaskHub] Task "${def.name}" introduces a circular dependency.`);
    }
  }

  /** 迭代式 DFS：检测新任务是否会形成循环依赖 */
  private hasCycle(newName: string, deps: string[]): boolean {
    const visited = new Set<string>();
    const stack = [...deps];

    while (stack.length > 0) {
      const name = stack.pop()!;
      if (name === newName) return true;
      if (visited.has(name)) continue;
      visited.add(name);
      stack.push(...(this.tasks.get(name)?.def.deps ?? []));
    }

    return false;
  }

  /** 按 priority 升序插入（二分查找定位） */
  private insertSorted(state: TaskState): void {
    const priority = state.def.priority ?? 10;
    let lo = 0;
    let hi = this.sortedTasks.length;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.sortedTasks[mid].def.priority ?? 10) <= priority) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    this.sortedTasks.splice(lo, 0, state);
  }

  /** 内部状态 → 公共快照 */
  private toSnapshot(task: TaskState): TaskSnapshot {
    return {
      name: task.def.name,
      type: task.def.type,
      status: task.status,
      lastRun: task.lastRun,
      deps: task.def.deps ?? [],
      retryCount: task.retryCount,
      error: task.error ? String(task.error) : undefined
    };
  }
}

export { TaskHub };
