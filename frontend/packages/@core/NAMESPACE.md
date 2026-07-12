# @core 命名空间

## 定位

`@core` 是项目的**基础设施层**，存放框架无关或轻度依赖 React 的核心能力包，以及独立发布的 CLI 工具。

放在这里的标准：

- 跨平台（Web / React Native / Node 均可使用，或仅需 React 而不依赖浏览器 API）
- 与业务逻辑无关，属于通用基础能力
- 有独立的职责边界，不与其他 @core 包循环依赖

不放在这里的：业务组件、页面级逻辑、特定平台才能用的 hooks（放 `packages/hooks`、`packages/ui` 等）。

## 当前包列表

```text
packages/@core/
├── types/       @skyroc/types         全局类型定义（零运行时依赖）
├── utils/       @skyroc/utils         通用工具函数（含 ./web 子入口）
├── color/       @skyroc/color         颜色处理 & 调色板生成
├── axios/       @skyroc/axios         类型安全的 HTTP 客户端
├── state/       @skyroc/core-state    Jotai 状态管理封装（依赖 React）
├── logger/      @skyroc/logger        跨平台日志系统
├── scheduler/   @skyroc/scheduler     协作式任务调度
├── service/     @skyroc/service       请求 & 查询基础设施（含 ./query 子入口）
└── scripts/     @skyroc/scripts       项目自动化 CLI（bin: sa）
```

### 各包简述

| 文件夹      | 包名                | 版本  | 说明                                                                                | 子入口    | React 依赖 |
| ----------- | ------------------- | ----- | ----------------------------------------------------------------------------------- | --------- | ---------- |
| `types`     | `@skyroc/types`     | 1.0.0 | `.d.ts` 全局类型声明，零依赖，所有包均可引用                                        | —         | 无         |
| `utils`     | `@skyroc/utils`     | 2.0.1 | 日期、加密、数组/对象、storage、emitter、priority-queue 等纯函数                    | `./web`   | 无         |
| `color`     | `@skyroc/color`     | 2.5.0 | 基于 colord / culori，提供 Ant Design / OKLCH 调色板生成                            | —         | 无         |
| `axios`     | `@skyroc/axios`     | 2.0.1 | 类型安全 axios 封装：重试、transform 流水线、abort 控制、可插拔后端响应             | —         | 无         |
| `state`     | `@skyroc/core-state`| 1.0.0 | Jotai 原子状态封装、全局 store、持久化 atom、storage registry                       | —         | 是         |
| `logger`    | `@skyroc/logger`    | 1.0.0 | 基于 LogLayer 的日志系统，适配 Web / RN / 小程序，含上传、清理、白名单管理          | —         | 无         |
| `scheduler` | `@skyroc/scheduler` | 1.0.0 | 协作式任务调度中枢，统一管理 init / periodic / listener 三类任务，支持 DAG、重试    | —         | 无         |
| `service`   | `@skyroc/service`   | 1.0.0 | 平台无关的请求 & 查询基础设施，通过 Adapter 注入 UI / Auth / 导航；集成 React Query | `./query` | 是         |
| `scripts`   | `@skyroc/scripts`   | 2.5.0 | 项目自动化 CLI（changelog / release / git-commit / cleanup），可执行命令 `sa`       | —         | 无         |

## 依赖方向

```text
types（零依赖，类型声明）
  ↑
utils（零 @core 依赖）       logger / scheduler / state / scripts（互相独立）
  ↑
color / axios（依赖 utils）
  ↑
service（依赖 axios）
```

> 箭头表示"被依赖"方向。禁止同层或反向依赖。
>
> `state` 通过 `peerDependencies` 依赖 `jotai >= 2.0.0` 与 `react >= 18.0.0`，不在内部依赖图里。

## 已知问题 / TODO

- `scheduler` 的 `package.json` 未声明任何 `dependencies`，需确认其内部是否完全自包含。

---

**最后更新**: 2026-04-22
