/** 任务类型 */
type TaskType = 'init' | 'listener' | 'periodic';

/** 任务运行状态 */
type TaskStatus = 'blocked' | 'done' | 'failed' | 'pending' | 'running';

/** 任务定义 — 注册时传入 */
interface TaskDef {
  /** 清理函数，TaskHub stop 时调用 */
  cleanup?: () => void;
  /** 依赖的任务名列表，这些任务完成后才会调度当前任务 */
  deps?: string[];
  /** 周期任务的执行间隔（ms），仅 periodic 类型有效 */
  interval?: number;
  /** 任务唯一标识 */
  name: string;
  /** 优先级，数字越小越先执行，默认 10 */
  priority?: number;
  /** 任务执行体 */
  run: () => void | Promise<void>;
  /** 任务类型：init 一次性 | periodic 周期性 | listener 监听器 */
  type: TaskType;
}

/** 内部任务状态 */
interface TaskState {
  /** 任务定义 */
  def: TaskDef;
  /** 最近一次失败的错误 */
  error?: unknown;
  /** 上次执行时间戳 */
  lastRun: number;
  /** 已重试次数 */
  retryCount: number;
  /** 当前状态 */
  status: TaskStatus;
}

/** 任务快照 — snapshot() 返回的单个任务信息 */
interface TaskSnapshot {
  /** 依赖列表 */
  deps: string[];
  /** 最近错误信息 */
  error?: string;
  /** 上次执行时间戳 */
  lastRun: number;
  /** 任务名 */
  name: string;
  /** 已重试次数 */
  retryCount: number;
  /** 当前状态 */
  status: TaskStatus;
  /** 任务类型 */
  type: TaskType;
}

/** TaskHub 配置项 */
interface TaskHubOptions {
  /** 重试基础延迟（ms），实际延迟 = baseRetryDelay * 2^retryCount，默认 1000 */
  baseRetryDelay?: number;
  /** 失败任务最大重试次数，默认 3，设为 0 禁用重试 */
  maxRetries?: number;
  /** 全部 init 任务完成时触发 */
  onReady?: () => void;
  /** 依赖任务永久失败导致当前任务无法执行时触发，blockedBy 为直接上游任务名 */
  onTaskBlocked?: (taskName: string, blockedBy: string) => void;
  /** 错误回调，任务失败时触发 */
  onTaskError?: (taskName: string, error: unknown) => void;
  /** 心跳间隔（ms），默认 1000 */
  tickInterval?: number;
}

export type { TaskDef, TaskHubOptions, TaskSnapshot, TaskState, TaskStatus, TaskType };
