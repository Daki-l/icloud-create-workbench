# @skyroc/hooks

与业务无关的通用 React Hooks 集合。通过 subpath exports 区分平台无关 hooks 和浏览器特定 hooks。

## 架构

```js
@skyroc/hooks
├── "."      → 平台无关 hooks（React Native 安全）
└── "./web"  → 浏览器 hooks + re-export 全部平台无关 hooks
```

### 分层设计

包内部按平台特性分为两层：

- **主出口（`.`）**：只包含不依赖 DOM / 浏览器 API 的 hooks。可以安全用于 React Native 等非浏览器环境。允许依赖 ahooks 中平台无关的部分（如 `useBoolean`、`useCountDown`）。
- **Web 出口（`./web`）**：包含依赖 `window`、`document`、`navigator` 等浏览器 API 的 hooks。自动 re-export 主出口全部内容，Web 端消费者只需关注这一个入口。

### 位置语义

本包位于 `packages/hooks/`（`packages/*` 中间层），而非 `packages/@core/` 或 `packages/web/`：

- 不放 `@core`：因为依赖了 ahooks 等第三方库，`@core` 要求零外部依赖
- 不放 `web`：因为主出口的 hooks 与浏览器无关，放在 `web` 语义不准确

### 与 ahooks 的关系

- ahooks 是本包的 **dependency**，作为内部实现细节使用
- **不 re-export** ahooks 的任何内容。消费者如需直接使用 ahooks（如 `useSize`、`useKeyPress`），应在自己的包中安装 ahooks 并直接 import

## 使用

```ts
// Web 应用 — 从 ./web 导入，拿到全部 hooks
import { useArray, useCopy, useLoading } from '@skyroc/hooks/web';

// React Native — 从主出口导入，只有平台安全的 hooks
import { useArray, useLoading } from '@skyroc/hooks';
```

## 新增 Hook 规则

### 判断放在哪里

| 条件                                                    | 放入                         |
| ------------------------------------------------------- | ---------------------------- |
| 不依赖 DOM / 浏览器 API                                 | `src/` → 从 `.` 导出         |
| 依赖 `window`、`document`、`navigator`、`matchMedia` 等 | `src/web/` → 从 `./web` 导出 |
| 依赖业务逻辑、i18n、特定 feature、特定 UI 库组件        | **不放本包**，留在 app 层    |

### 判断依据

关注的是 hook 运行时是否需要浏览器环境，而非它依赖的库是否"web 向"。例如 ahooks 的 `useBoolean` 虽然来自一个 Web 向的库，但它本身不调用任何浏览器 API，所以封装它的 hook 放在主出口。

### 编码规范

遵循项目 `CLAUDE.md` 中定义的 React 编码规则，关键点：

- **禁止 `useCallback`**：内部函数使用 function 声明
- **`useMemo` 仅限两种场景**：派生值、确实昂贵的计算
- 所有 hook 使用 **function 声明**导出（非箭头函数，hooks 不是组件）
- 内部辅助函数使用 **function 声明**，不用箭头函数
- 文件必须包含**显式 import**，不依赖 auto-import（子包没有 auto-import 配置）

### 导出清单维护

新增 hook 后需要更新对应的 barrel export：

- 平台无关 hook → 更新 `src/index.ts`
- 浏览器 hook → 更新 `src/web/index.ts`（主出口会被 web 出口自动 re-export，不需要两边都加）
