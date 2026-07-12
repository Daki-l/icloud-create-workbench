import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskHub } from '../src/core/task-hub';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('TaskHub - 注册', () => {
  it('链式注册多个任务', () => {
    const hub = new TaskHub();

    hub.register({ name: 'a', type: 'init', run: vi.fn() }).register({ name: 'b', type: 'init', run: vi.fn() });

    expect(hub.snapshot()).toHaveLength(2);
  });

  it('批量注册', () => {
    const hub = new TaskHub();

    hub.registerAll([
      { name: 'a', type: 'init', run: vi.fn() },
      { name: 'b', type: 'init', run: vi.fn() }
    ]);

    expect(hub.snapshot()).toHaveLength(2);
  });

  it('重复注册同名任务跳过', () => {
    const hub = new TaskHub();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    hub.register({ name: 'a', type: 'init', run: vi.fn() });
    hub.register({ name: 'a', type: 'init', run: vi.fn() });

    expect(hub.snapshot()).toHaveLength(1);
    expect(warn).toHaveBeenCalledOnce();

    warn.mockRestore();
  });

  it('自引用依赖抛错', () => {
    const hub = new TaskHub();

    expect(() => {
      hub.register({ name: 'a', type: 'init', deps: ['a'], run: vi.fn() });
    }).toThrow('cannot depend on itself');
  });

  it('缺少 name 抛错', () => {
    const hub = new TaskHub();

    expect(() => {
      hub.register({ name: '', type: 'init', run: vi.fn() });
    }).toThrow('name is required');
  });

  it('缺少 run 函数抛错', () => {
    const hub = new TaskHub();

    expect(() => {
      hub.register({ name: 'a', type: 'init', run: undefined as any });
    }).toThrow('must have a run function');
  });

  it('periodic interval <= 0 抛错', () => {
    const hub = new TaskHub();

    expect(() => {
      hub.register({ name: 'a', type: 'periodic', interval: 0, run: vi.fn() });
    }).toThrow('interval must be positive');
  });
});

describe('TaskHub - init 任务', () => {
  it('启动后立即执行无依赖的 init 任务', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'a', type: 'init', run });
    hub.start();

    await vi.advanceTimersByTimeAsync(200);

    expect(run).toHaveBeenCalledOnce();
    expect(hub.getTask('a')?.status).toBe('done');

    hub.stop();
  });

  it('init 任务只执行一次', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'a', type: 'init', run });
    hub.start();

    await vi.advanceTimersByTimeAsync(500);

    expect(run).toHaveBeenCalledOnce();

    hub.stop();
  });

  it('按优先级排序执行', async () => {
    const order: string[] = [];
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({
      name: 'low',
      type: 'init',
      priority: 20,
      run: () => {
        order.push('low');
      }
    });
    hub.register({
      name: 'high',
      type: 'init',
      priority: 1,
      run: () => {
        order.push('high');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(order).toEqual(['high', 'low']);

    hub.stop();
  });
});

describe('TaskHub - 依赖解析', () => {
  it('依赖未满足时不执行', async () => {
    const runB = vi.fn();
    const hub = new TaskHub();

    hub.register({
      name: 'a',
      type: 'init',
      run: () =>
        new Promise(resolve => {
          setTimeout(resolve, 2000);
        })
    });
    hub.register({
      name: 'b',
      type: 'init',
      deps: ['a'],
      run: runB
    });

    hub.start();

    // 第一个 tick：a 开始执行，b 等待
    await vi.advanceTimersByTimeAsync(100);
    expect(runB).not.toHaveBeenCalled();
    expect(hub.getTask('b')?.status).toBe('pending');

    hub.stop();
  });

  it('依赖完成后执行下游任务', async () => {
    const order: string[] = [];
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({
      name: 'auth',
      type: 'init',
      priority: 1,
      run: async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 200);
        });
        order.push('auth');
      }
    });
    hub.register({
      name: 'permissions',
      type: 'init',
      priority: 2,
      deps: ['auth'],
      run: () => {
        order.push('permissions');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(500);

    expect(order).toEqual(['auth', 'permissions']);

    hub.stop();
  });

  it('链式依赖 a → b → c', async () => {
    const order: string[] = [];
    const hub = new TaskHub({ tickInterval: 50 });

    hub.register({
      name: 'a',
      type: 'init',
      run: () => {
        order.push('a');
      }
    });
    hub.register({
      name: 'b',
      type: 'init',
      deps: ['a'],
      run: () => {
        order.push('b');
      }
    });
    hub.register({
      name: 'c',
      type: 'init',
      deps: ['b'],
      run: () => {
        order.push('c');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(order).toEqual(['a', 'b', 'c']);

    hub.stop();
  });
});

describe('TaskHub - periodic 任务', () => {
  it('执行中时跳过本次 tick', async () => {
    let _running = false;
    const hub = new TaskHub({ tickInterval: 50 });

    hub.register({
      name: 'slow',
      type: 'periodic',
      interval: 50,
      run: () =>
        new Promise<void>(resolve => {
          _running = true;
          setTimeout(() => {
            _running = false;
            resolve();
          }, 150) // 150ms > tickInterval=50ms，下一 tick 触发时仍在执行中
        })
    });

    hub.start();
    // t=0: 立即执行，status='running'
    // t=50: 第二次 tick，status=running，命中 line 202 的 return
    await vi.advanceTimersByTimeAsync(80);

    expect(hub.getTask('slow')?.status).toBe('running');

    await vi.advanceTimersByTimeAsync(200);

    hub.stop();
  });

  it('按间隔重复执行', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'poll', type: 'periodic', interval: 300, run });
    hub.start();

    // t=0: 首次 tick，lastRun=0 所以立即执行
    // t=300: 间隔到了，第二次
    // t=600: 第三次
    await vi.advanceTimersByTimeAsync(700);

    expect(run.mock.calls.length).toBeGreaterThanOrEqual(3);

    hub.stop();
  });

  it('依赖满足前不执行', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({
      name: 'auth',
      type: 'init',
      run: () =>
        new Promise(resolve => {
          setTimeout(resolve, 500);
        })
    });
    hub.register({
      name: 'heartbeat',
      type: 'periodic',
      interval: 100,
      deps: ['auth'],
      run
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(run).not.toHaveBeenCalled();

    hub.stop();
  });
});

describe('TaskHub - listener 任务', () => {
  it('依赖未满足时不注册', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({
      name: 'auth',
      type: 'init',
      run: () =>
        new Promise(resolve => {
          setTimeout(resolve, 500);
        })
    });
    hub.register({
      name: 'ws',
      type: 'listener',
      deps: ['auth'],
      run
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(200);

    expect(run).not.toHaveBeenCalled();
    expect(hub.getTask('ws')?.status).toBe('pending');

    hub.stop();
  });

  it('注册一次，stop 时 cleanup', async () => {
    const run = vi.fn();
    const cleanup = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'resize', type: 'listener', run, cleanup });
    hub.start();

    await vi.advanceTimersByTimeAsync(200);

    expect(run).toHaveBeenCalledOnce();
    expect(cleanup).not.toHaveBeenCalled();

    hub.stop();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('失败后自动重试直到成功', async () => {
    let callCount = 0;
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 3, baseRetryDelay: 100 });

    hub.register({
      name: 'watch',
      type: 'listener',
      run: () => {
        callCount += 1;
        if (callCount < 2) throw new Error('fail');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(2000);

    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(hub.getTask('watch')?.status).toBe('done');

    hub.stop();
  });

  it('失败且重试次数耗尽后保持 failed', async () => {
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 1, baseRetryDelay: 100 });

    hub.register({
      name: 'watch',
      type: 'listener',
      run: () => {
        throw new Error('always fail');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(3000);

    expect(hub.getTask('watch')?.status).toBe('failed');

    hub.stop();
  });

  it('失败后等待重试延迟未到不重试', async () => {
    const run = vi.fn().mockImplementation(() => {
      throw new Error('fail');
    });
    const hub = new TaskHub({ tickInterval: 50, maxRetries: 3, baseRetryDelay: 1000 });

    hub.register({ name: 'watch', type: 'listener', run });

    hub.start();
    await vi.advanceTimersByTimeAsync(100);

    // 首次失败
    expect(run).toHaveBeenCalledTimes(1);
    expect(hub.getTask('watch')?.status).toBe('failed');

    // 等待 200ms，延迟未到（baseRetryDelay=1000ms），不重试
    await vi.advanceTimersByTimeAsync(200);
    expect(run).toHaveBeenCalledTimes(1);

    hub.stop();
  });
});

describe('TaskHub - 重试', () => {
  it('失败任务自动重试', async () => {
    let callCount = 0;
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 3, baseRetryDelay: 100 });

    hub.register({
      name: 'flaky',
      type: 'init',
      run: () => {
        callCount += 1;
        if (callCount < 3) {
          throw new Error('fail');
        }
      }
    });

    hub.start();

    // 给足够的时间让重试完成（指数退避：100ms, 200ms）
    await vi.advanceTimersByTimeAsync(2000);

    expect(callCount).toBe(3);
    expect(hub.getTask('flaky')?.status).toBe('done');

    hub.stop();
  });

  it('超过最大重试次数后保持 failed', async () => {
    const onTaskError = vi.fn();
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 2, baseRetryDelay: 100, onTaskError });

    hub.register({
      name: 'broken',
      type: 'init',
      run: () => {
        throw new Error('always fail');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(5000);

    expect(hub.getTask('broken')?.status).toBe('failed');
    expect(onTaskError).toHaveBeenCalled();

    hub.stop();
  });

  it('maxRetries=0 禁用重试', async () => {
    let callCount = 0;
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 0 });

    hub.register({
      name: 'once',
      type: 'init',
      run: () => {
        callCount += 1;
        throw new Error('fail');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(callCount).toBe(1);
    expect(hub.getTask('once')?.status).toBe('failed');

    hub.stop();
  });
});

describe('TaskHub - 生命周期', () => {
  it('start/stop 基本流程', () => {
    const hub = new TaskHub();

    expect(hub.running).toBe(false);

    hub.start();
    expect(hub.running).toBe(true);

    hub.stop();
    expect(hub.running).toBe(false);
    expect(hub.snapshot()).toHaveLength(0);
  });

  it('未启动时调用 stop 无副作用', () => {
    const hub = new TaskHub();
    expect(() => hub.stop()).not.toThrow();
    expect(hub.running).toBe(false);
  });

  it('未启动时调用 resume 无副作用', () => {
    const hub = new TaskHub();
    expect(() => hub.resume()).not.toThrow();
    expect(hub.running).toBe(false);
  });

  it('已有 timer 时 resume 不重复创建', () => {
    const hub = new TaskHub();
    hub.start();
    hub.resume(); // timer 已存在，应为 no-op
    expect(hub.running).toBe(true);
    hub.stop();
  });

  it('已暂停时再次 pause 无副作用', () => {
    const hub = new TaskHub();
    hub.start();
    hub.pause();
    expect(() => hub.pause()).not.toThrow(); // tickTimer 已为 null
    hub.stop();
  });

  it('pause/resume', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'poll', type: 'periodic', interval: 100, run });
    hub.start();

    await vi.advanceTimersByTimeAsync(250);
    const countBeforePause = run.mock.calls.length;

    hub.pause();
    await vi.advanceTimersByTimeAsync(500);

    // pause 后不再执行
    expect(run.mock.calls.length).toBe(countBeforePause);

    hub.resume();
    await vi.advanceTimersByTimeAsync(250);

    // resume 后恢复执行
    expect(run.mock.calls.length).toBeGreaterThan(countBeforePause);

    hub.stop();
  });

  it('重复 start 无副作用', () => {
    const hub = new TaskHub();

    hub.start();
    hub.start();

    expect(hub.running).toBe(true);

    hub.stop();
  });

  it('onReady 在所有 init 完成后触发', async () => {
    const onReady = vi.fn();
    const hub = new TaskHub({ tickInterval: 50, onReady });

    hub.register({ name: 'a', type: 'init', run: vi.fn() });
    hub.register({ name: 'b', type: 'init', deps: ['a'], run: vi.fn() });
    hub.register({ name: 'poll', type: 'periodic', interval: 1000, run: vi.fn() });

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(onReady).toHaveBeenCalledOnce();

    hub.stop();
  });

  it('无 init 任务时 onReady 不触发', async () => {
    const onReady = vi.fn();
    const hub = new TaskHub({ tickInterval: 50, onReady });

    hub.register({ name: 'poll', type: 'periodic', interval: 100, run: vi.fn() });

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(onReady).not.toHaveBeenCalled();

    hub.stop();
  });

  it('未设置 onReady 时 checkReady 不报错', async () => {
    const hub = new TaskHub({ tickInterval: 50 }); // 无 onReady

    hub.register({ name: 'a', type: 'init', run: vi.fn() });

    hub.start();
    await expect(vi.advanceTimersByTimeAsync(200)).resolves.not.toThrow();

    hub.stop();
  });
});

describe('TaskHub - 动态增删', () => {
  it('运行时 add 任务', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.start();

    hub.add({ name: 'late', type: 'init', run });

    await vi.advanceTimersByTimeAsync(200);

    expect(run).toHaveBeenCalledOnce();

    hub.stop();
  });

  it('运行时 remove 任务并触发 cleanup', async () => {
    const cleanup = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'x', type: 'listener', run: vi.fn(), cleanup });
    hub.start();
    await vi.advanceTimersByTimeAsync(200);

    const removed = hub.remove('x');

    expect(removed).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(hub.snapshot()).toHaveLength(0);

    hub.stop();
  });

  it('remove 不存在的任务返回 false', () => {
    const hub = new TaskHub();
    expect(hub.remove('nope')).toBe(false);
  });
});

describe('TaskHub - 边界场景', () => {
  it('periodic 任务不指定 interval 使用默认 5000ms', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'poll', type: 'periodic', run }); // 不指定 interval

    hub.start();
    // t=0 firstTick: lastRun=0, now-0 >> 5000, 执行第一次
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(1);

    // 再等 100ms，now - lastRun = ~100ms < 5000ms，不再执行
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(1);

    hub.stop();
  });

  it('priority/deps 空值合并默认分支覆盖', async () => {
    const hub = new TaskHub({ tickInterval: 100 });
    hub.register({ name: 'a', type: 'init', run: vi.fn() });
    hub.register({ name: 'b', type: 'init', run: vi.fn() });

    // 直接清除内部 priority，触发排序中 ?? 10 右侧分支（需要至少 2 个任务使比较器被调用）
    const stateA = (hub as any).tasks.get('a');
    const stateB = (hub as any).tasks.get('b');
    stateA.def.priority = undefined;
    stateB.def.priority = undefined;

    // 直接清除 deps，触发 depsResolved 和 getTask 中 ?? [] 右侧分支
    stateA.def.deps = undefined;

    hub.start();
    await vi.advanceTimersByTimeAsync(200);

    const snap = hub.snapshot();
    expect(snap).toHaveLength(2);

    const task = hub.getTask('a');
    expect(task?.deps).toEqual([]);

    hub.stop(); // stop 内部排序也会触发 ?? 10
  });

  it('依赖不存在的任务时不执行', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'a', type: 'init', deps: ['nonexistent'], run });

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(run).not.toHaveBeenCalled();

    hub.stop();
  });

  it('未知类型任务 tick 中走 default 分支不执行', async () => {
    const run = vi.fn();
    const hub = new TaskHub({ tickInterval: 100 });

    hub.register({ name: 'a', type: 'init', run });

    // 强制修改内部 type 为未知值
    const state = (hub as any).tasks.get('a');
    state.def.type = 'unknown';

    hub.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(run).not.toHaveBeenCalled();

    hub.stop();
  });

  it('init 任务失败后 retryDelay 未到不重试', async () => {
    const run = vi.fn().mockImplementation(() => {
      throw new Error('fail');
    });
    const hub = new TaskHub({ tickInterval: 50, maxRetries: 3, baseRetryDelay: 2000 });

    hub.register({ name: 'a', type: 'init', run });

    hub.start();
    await vi.advanceTimersByTimeAsync(100);

    // 首次失败
    expect(run).toHaveBeenCalledTimes(1);

    // 等待 500ms，延迟未到（baseRetryDelay=2000ms），不重试
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(1);

    hub.stop();
  });
});

describe('TaskHub - snapshot', () => {
  it('返回按优先级排序的快照', () => {
    const hub = new TaskHub();

    hub.register({ name: 'low', type: 'init', priority: 99, run: vi.fn() });
    hub.register({ name: 'high', type: 'init', priority: 1, run: vi.fn() });

    const snap = hub.snapshot();

    expect(snap[0].name).toBe('high');
    expect(snap[1].name).toBe('low');
  });

  it('getTask 返回单个任务信息', () => {
    const hub = new TaskHub();

    hub.register({ name: 'test', type: 'init', deps: ['x'], run: vi.fn() });

    const task = hub.getTask('test');

    expect(task?.name).toBe('test');
    expect(task?.type).toBe('init');
    expect(task?.status).toBe('pending');
    expect(task?.deps).toEqual(['x']);
  });

  it('getTask 不存在返回 undefined', () => {
    const hub = new TaskHub();
    expect(hub.getTask('nope')).toBeUndefined();
  });

  it('snapshot 和 getTask 包含失败任务的错误信息', async () => {
    const hub = new TaskHub({ tickInterval: 100, maxRetries: 0 });

    hub.register({
      name: 'broken',
      type: 'init',
      run: () => {
        throw new Error('test error msg');
      }
    });

    hub.start();
    await vi.advanceTimersByTimeAsync(200);

    const snap = hub.snapshot();
    expect(snap[0].error).toContain('test error msg');

    const task = hub.getTask('broken');
    expect(task?.error).toContain('test error msg');

    hub.stop();
  });
});
