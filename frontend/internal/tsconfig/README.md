# @skyroc/tsconfig

> 共享的 TypeScript 配置

## 📦 包信息

- **包名**: `@skyroc/tsconfig`
- **版本**: `1.0.0`
- **平台**: Universal
- **职责**: 提供统一的 TypeScript 编译配置

## 🎯 配置文件说明

### base.json - 基础配置

所有配置的基础，包含严格的类型检查规则：

- `strict: true` - 启用所有严格类型检查
- `noUncheckedIndexedAccess: true` - 索引访问需要检查
- `verbatimModuleSyntax: true` - 严格的模块语法
- `isolatedModules: true` - 支持单文件编译

### library.json - 库包配置

用于 `packages/` 下的库包：

```json
{
  "extends": "@skyroc/tsconfig/library.json"
}
```

特点：

- 生成类型声明文件 (`.d.ts`)
- 仅输出类型，不编译代码（使用 tsdown 或其他工具编译）
- JSX 使用 `react-jsx` 模式

### node.json - Node 包配置

用于 `internal/` 下的 Node.js 工具包：

```json
{
  "extends": "@skyroc/tsconfig/node.json"
}
```

特点：

- 包含 Node.js 类型定义
- 使用 `node` 模块解析策略
- 不包含 DOM 相关类型

### web.json - Web 包配置

用于 Web 专用的包（如 `@skyroc/web-*`）：

```json
{
  "extends": "@skyroc/tsconfig/web.json"
}
```

特点：

- 包含 DOM 类型库
- 配置 Vite 客户端类型
- JSX 使用 `react-jsx` 模式
- 使用 `bundler` 模块解析策略

### web-app.json - Web 应用配置

用于 `apps/admin` 等 Web 应用：

```json
{
  "extends": "@skyroc/tsconfig/web-app.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

特点：

- 继承自 `web.json`
- 预配置路径别名
- 适用于 Vite 应用

### react-native.json - React Native 配置

用于 React Native 应用和跨平台包：

```json
{
  "extends": "@skyroc/tsconfig/react-native.json"
}
```

特点：

- 包含 React Native 类型
- 使用 `node` 模块解析（React Native 要求）
- 不包含 DOM 类型

## 📐 使用示例

### 1. 库包使用

```json
// packages/core-auth/tsconfig.json
{
  "extends": "@skyroc/tsconfig/library.json",
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

### 2. Web 包使用

```json
// packages/web-router/tsconfig.json
{
  "extends": "@skyroc/tsconfig/web.json",
  "include": ["src/**/*"]
}
```

### 3. Web 应用使用

```json
// apps/admin/tsconfig.json
{
  "extends": "@skyroc/tsconfig/web-app.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@skyroc/*": ["../../packages/*/src"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"],
  "references": [{ "path": "../../packages/core-auth" }, { "path": "../../packages/web-router" }]
}
```

### 4. React Native 应用使用

```json
// apps/mobile/tsconfig.json
{
  "extends": "@skyroc/tsconfig/react-native.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "index.js"]
}
```

### 5. Node 工具包使用

```json
// internal/uno-config/tsconfig.json
{
  "extends": "@skyroc/tsconfig/node.json",
  "include": ["src/**/*"]
}
```

## 🎨 配置选择决策树

```
是否是 Node.js 工具？
├─ 是 → node.json
└─ 否 → 是否生成类型声明？
    ├─ 是 → library.json
    └─ 否 → 是否包含 DOM API？
        ├─ 是 → 是否是应用？
        │   ├─ 是 → web-app.json
        │   └─ 否 → web.json
        └─ 否 → react-native.json
```

## 🔧 编译器选项说明

### 严格模式选项

- `strict: true` - 启用所有严格检查
- `strictNullChecks: true` - null/undefined 严格检查
- `noImplicitAny: true` - 禁止隐式 any
- `noUncheckedIndexedAccess: true` - 索引访问返回 `T | undefined`

### 模块选项

- `module: "ESNext"` - 使用 ESNext 模块
- `moduleResolution: "bundler"` - 使用 bundler 策略（Vite、Rollup）
- `verbatimModuleSyntax: true` - 严格的 import/export 语法

### 输出选项

- `noEmit: true` - 不输出 JS 文件（基础配置）
- `declaration: true` - 生成 .d.ts 文件（库配置）
- `removeComments: true` - 移除注释

### 代码质量选项

- `noUnusedLocals: true` - 检查未使用的局部变量
- `noUnusedParameters: true` - 检查未使用的参数
- `noFallthroughCasesInSwitch: true` - switch 语句必须有 break

## 🔄 迁移步骤

### 1. 安装依赖

在根目录的 `pnpm-workspace.yaml` 中确保包含 `internal/*`：

```yaml
packages:
  - apps/*
  - packages/*
  - internal/*
```

### 2. 更新现有包

替换每个包的 `tsconfig.json`：

```bash
# 库包
echo '{"extends": "@skyroc/tsconfig/library.json", "include": ["src/**/*"]}' > packages/core-auth/tsconfig.json

# Web 应用
echo '{"extends": "@skyroc/tsconfig/web-app.json", "include": ["src/**/*"]}' > apps/admin/tsconfig.json
```

### 3. 配置路径别名

在应用级别添加 paths 配置：

```json
{
  "extends": "@skyroc/tsconfig/web-app.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@skyroc/core-*": ["../../packages/core-*/src"],
      "@skyroc/web-*": ["../../packages/web-*/src"]
    }
  }
}
```

## 📝 维护指南

### 何时修改 base.json

- 需要调整全局严格性规则
- 需要添加全局编译器选项
- TypeScript 版本升级后的配置调整

### 何时添加新配置

- 新的平台支持（如 Electron）
- 新的构建工具支持（如 Webpack）
- 特定场景的定制需求

### 版本管理

此包使用固定版本号，不需要频繁发布：

- 小调整：直接修改，不变更版本
- 大调整：需要版本升级并通知所有使用者

## 🔗 相关文档

- [TypeScript 官方文档](https://www.typescriptlang.org/tsconfig)
- [Vite TypeScript 配置](https://vitejs.dev/guide/features.html#typescript)
- [React Native TypeScript](https://reactnative.dev/docs/typescript)

---

**最后更新**: 2026-01-25
**维护者**: 项目团队
