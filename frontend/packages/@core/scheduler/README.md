# @skyroc/scheduler

协作式任务调度中枢 — 统一管理应用启动时的初始化、定时器和监听器。

## 解决什么问题

复杂应用启动时面临的典型困境：

```
❌ 认证、配置、权限、路由 … 各自 init，执行顺序靠运气
❌ 心跳、上报、轮询、token 刷新 … 每个一个 setInterval，谁也管不着谁
❌ resize、online/offline、visibilitychange … 监听器散落各处，清理全靠记忆
```

TaskHub 的答案：**一个心跳 + 一个任务注册表 + 依赖关系声明**。

```
✅ 声明式注册，依赖自动解析
✅ 永远只有一个 setInterval
✅ hub.stop() 一次性清理所有任务
```

## 核心概念

### 三种任务类型

| 类型       | 行为                                        | 典型场景                     |
| ---------- | ------------------------------------------- | ---------------------------- |
| `init`     | 依赖满足后执行**一次**                      | 认证、加载配置、初始化路由   |
| `periodic` | 依赖满足后按 `interval` **周期执行**        | 心跳、数据上报、token 刷新   |
| `listener` | 依赖满足后注册**一次**，stop 时自动 cleanup | resize、网络状态、页面可见性 |

### 调度模型

```
TaskHub.start()
    │
    ▼
┌─ Tick Loop（单一 setInterval）──────────────────┐
│                                                  │
│  遍历任务表（按 priority 排序）                     │
│    ├─ init:     deps 满足 + pending → 执行一次     │
│    ├─ periodic: deps 满足 + 间隔到了 → 再次执行     │
│    └─ listener: deps 满足 + pending → 注册一次     │
│                                                  │
│  检查：所有 init 完成？ → 触发 onReady              │
│                                                  │
└──────────────────────────────────────────────────┘
    │
    ▼
TaskHub.stop()  →  逆序调用所有 cleanup  →  清空任务表
```

## 安装

包已在 monorepo 内，直接引用：

```ts
import { TaskHub } from '@skyroc/scheduler';
```

## 快速上手

```ts
const hub = new TaskHub({
  tickInterval: 1000,
  onReady: () => {
    console.log('所有初始化完成，应用就绪');
  },
  onTaskError: (name, err) => {
    console.error(`任务 ${name} 失败:`, err);
  }
});

// ---- 1. 初始化任务（有依赖链）----

hub.register({
  name: 'auth',
  type: 'init',
  priority: 1,
  run: async () => {
    await authService.init();
  }
});

hub.register({
  name: 'permissions',
  type: 'init',
  priority: 2,
  deps: ['auth'],
  run: async () => {
    await permissionService.load();
  }
});

hub.register({
  name: 'routes',
  type: 'init',
  priority: 3,
  deps: ['permissions'],
  run: async () => {
    await routerService.initDynamicRoutes();
  }
});

// ---- 2. 周期任务 ----

hub.register({
  name: 'heartbeat',
  type: 'periodic',
  interval: 30_000,
  deps: ['auth'],
  run: () => {
    api.heartbeat();
  }
});

hub.register({
  name: 'analytics',
  type: 'periodic',
  interval: 60_000,
  run: () => {
    analytics.flush();
  }
});

// ---- 3. 监听器任务 ----

hub.register({
  name: 'network-monitor',
  type: 'listener',
  run: () => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  },
  cleanup: () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
});

// ---- 启动 ----
hub.start();

// ---- 应用卸载时 ----
hub.stop();
```

## API

### `new TaskHub(options?)`

创建调度实例。

```ts
interface TaskHubOptions {
  tickInterval?: number; // 心跳间隔（ms），默认 1000
  maxRetries?: number; // 失败重试次数，默认 3，设为 0 禁用
  baseRetryDelay?: number; // 重试基础延迟（ms），实际延迟 = base * 2^retryCount，默认 1000
  onTaskError?: (taskName: string, error: unknown) => void;
  onReady?: () => void; // 所有 init 任务完成时触发
}
```

### `.register(def)` / `.registerAll(defs)`

注册任务。支持链式调用。

```ts
interface TaskDef {
  name: string; // 唯一标识
  type: 'init' | 'periodic' | 'listener';
  priority?: number; // 数字越小越先执行，默认 10
  deps?: string[]; // 依赖的任务名
  interval?: number; // 周期间隔（ms），仅 periodic
  run: () => void | Promise<void>; // 执行体
  cleanup?: () => void; // 清理函数
}
```

```ts
// 链式
hub.register({ name: 'a', type: 'init', run: initA }).register({ name: 'b', type: 'init', deps: ['a'], run: initB });

// 批量
hub.registerAll([taskA, taskB, taskC]);
```

### `.start()` / `.stop()`

- `start()` — 启动心跳循环，立即执行首次 tick
- `stop()` — 停止心跳，逆优先级顺序调用所有 cleanup，清空任务表

### `.pause()` / `.resume()`

- `pause()` — 暂停心跳（不清理任务状态）
- `resume()` — 恢复心跳

适用于页面切到后台时暂停、切回前台时恢复的场景。

### `.add(def)` / `.remove(name)`

运行时动态增删任务。

```ts
// 进入某页面时追加
hub.add({ name: 'page-poll', type: 'periodic', interval: 5000, run: pollData });

// 离开时移除（自动调用 cleanup），返回 boolean，任务不存在时返回 false
hub.remove('page-poll');
```

### `.snapshot()` / `.getTask(name)`

查看任务状态，用于调试或构建可视化面板。

```ts
hub.snapshot();
// 返回值按 priority 升序排列：
// [
//   { name: 'auth',        type: 'init',     status: 'done',    lastRun: 1707820800000, deps: [],         retryCount: 0 },
//   { name: 'permissions', type: 'init',     status: 'done',    lastRun: 1707820800100, deps: ['auth'],   retryCount: 0 },
//   { name: 'heartbeat',   type: 'periodic', status: 'done',    lastRun: 1707820830000, deps: ['auth'],   retryCount: 0 },
//   { name: 'routes',      type: 'init',     status: 'failed',  lastRun: 1707820800200, deps: ['perm..'], retryCount: 3, error: 'Error: timeout' },
// ]

hub.getTask('auth');
// { name: 'auth', type: 'init', status: 'done', lastRun: 1707820800000, deps: [], retryCount: 0 }
// 任务不存在时返回 undefined
```

### `.running`

只读属性，当前是否在运行。

## 重试机制

失败的 `init` 和 `listener` 任务会自动重试（`periodic` 天然会在下个周期重试）。

- 重试次数：`maxRetries`（默认 3）
- 退避策略：指数退避，延迟 = `baseRetryDelay * 2^retryCount`
- 设为 `maxRetries: 0` 禁用重试

```
第 1 次重试：1s 后
第 2 次重试：2s 后
第 3 次重试：4s 后
超过次数 → 保持 failed 状态，触发 onTaskError
```

## 依赖关系

通过 `deps` 声明任务间的依赖，TaskHub 自动解析执行顺序。

```ts
// auth → permissions → routes（链式依赖）
hub.register({ name: 'auth',        type: 'init', run: ... });
hub.register({ name: 'permissions', type: 'init', deps: ['auth'], run: ... });
hub.register({ name: 'routes',      type: 'init', deps: ['permissions'], run: ... });

// heartbeat 等 auth 完成后才开始周期执行
hub.register({ name: 'heartbeat', type: 'periodic', interval: 30000, deps: ['auth'], run: ... });
```

依赖任务 `failed` 且无法重试时，下游任务将一直保持 `pending`。

## 与传统方式对比

| 维度             | N 个 `setInterval`       | `TaskHub`               |
| ---------------- | ------------------------ | ----------------------- |
| 依赖关系         | 无法表达                 | `deps` 天然支持 DAG     |
| 执行顺序         | 靠代码位置，容易出错     | `priority` + 依赖自动保证 |
| 清理             | 逐一保存 timer id，容易遗漏 | `stop()` 一次清理全部 |
| 暂停/恢复        | 需自行维护状态           | `pause()` / `resume()`  |
| 状态观测         | 无                       | `snapshot()` 随时看全貌 |
| Timer 数量       | 随业务线性膨胀           | 永远只有 1 个           |
| 错误处理         | 各自为政                 | 统一 `onTaskError`      |
| 重试             | 需手动实现               | 指数退避，开箱即用      |

## 在 React 中使用

将 `TaskHub` 的生命周期绑定到应用根组件。在**模块作用域**创建单例，避免 React StrictMode 双调用的干扰：

```ts
import { useEffect } from 'react';
import { TaskHub } from '@skyroc/scheduler';

const hub = new TaskHub({
  tickInterval: 1000,
  onReady: () => store.dispatch(setAppReady(true)),
  onTaskError: (name, err) => logger.error(name, err)
});

hub.registerAll([authTask, permissionTask, heartbeatTask, networkTask]);

export function AppScheduler() {
  useEffect(() => {
    hub.start();
    return () => hub.stop();
  }, []);

  return null;
}
```

## 设计原则

- **零框架依赖** — 纯 class，Web / React Native / Node 均可使用
- **声明式 > 命令式** — 注册任务定义，调度交给引擎
- **单一职责** — 只做调度，不做业务逻辑
- **可观测** — snapshot 提供完整的运行时状态

## 测试

```bash
# 从 monorepo 根目录
npx vitest run packages/@core/scheduler/__tests__/task-hub.test.ts

# 或在包目录内
cd packages/@core/scheduler && pnpm test

# 含覆盖率报告
pnpm test --coverage
```

46 个测试用例，覆盖率 100%（Statements / Branches / Functions / Lines），覆盖：注册校验、三种任务类型调度、依赖解析、失败重试与指数退避、生命周期边界（`start` / `stop` / `pause` / `resume`）、`onReady` 触发条件、动态增删、快照查询及错误字段。
