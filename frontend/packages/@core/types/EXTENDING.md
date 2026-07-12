# 如何扩展全局类型

本文档说明如何在具体项目或功能包中扩展 `@skyroc/types` 提供的全局类型定义。

## 核心概念:TypeScript 声明合并

TypeScript 允许在不同文件中对同一个 namespace 或 interface 进行**声明合并**。这意味着:

- 基础扩展点在 `@skyroc/types` 中定义
- 具体字段由实际 owner 声明：功能包声明自己读写的字段，项目声明项目私有字段
- 内置资源的结构由资源 owner 声明：例如 `@skyroc/web-admin-i18n` 根据自己的 locale JSON 扩展 `I18n.LocaleMessages`
- TypeScript 自动合并这些声明,无需手动导入

## 架构设计

```
packages/@core/types/         ← 基础扩展点(跨项目共享)
  └── src/app/storage.d.ts

packages/web/admin-theme/     ← 主题包拥有的缓存键
  └── src/types/theme.d.ts

packages/web/admin-layouts/   ← 布局包拥有的缓存键
  └── src/types/storage.ts

packages/web/admin-i18n/      ← i18n 包拥有的内置 locale schema
  └── src/types/i18n.ts

apps/admin/                   ← Admin 项目特定扩展
  └── src/types/storage.d.ts

apps/mobile/                  ← Mobile 项目特定扩展
  └── src/types/storage.d.ts
```

## 实战示例:扩展 StorageType

### 1. 基础类型定义 (`packages/@core/types/src/app/storage.d.ts`)

```typescript
declare global {
  namespace StorageType {
    interface Session {}

    interface Local {}
  }
}

export {};
```

### 2. Owner 扩展 (`apps/admin/src/types/storage.d.ts`)

```typescript
/**
 * Admin app specific storage type extensions.
 *
 * Base extension points are defined in: packages/@core/types/src/app/storage.d.ts.
 */
declare global {
  namespace StorageType {
    interface Session {}

    interface Local {
      /** The refresh token owned by the admin auth flow. */
      refreshToken: string;
      /** The access token owned by the admin auth flow. */
      token: string;
    }
  }
}

export {};
```

### 3. 最终合并结果

在 `apps/admin` 项目中,`StorageType.Local` 由多个 owner 合并:

```typescript
// 来自 @skyroc/types (基础扩展点)
// 无字段，仅提供可合并的 interface

// 来自 @skyroc/web-admin-theme
themeSettings: Theme.ThemeSetting;
themeColor: string;

// 来自 @skyroc/web-admin-layouts
globalTabs: App.Global.Tab[];

// 来自 apps/admin
token: string;
refreshToken: string;
```

## 关键要点

### ✅ DO - 正确做法

1. **基础类型使用 `declare global`**

   ```typescript
   declare global {
     namespace StorageType {
       interface Local { ... }
     }
   }
   export {};
   ```

2. **项目扩展也使用 `declare global`**

   ```typescript
   declare global {
     namespace StorageType {
       interface Local {
         // 只添加项目特定字段
       }
     }
   }
   export {};
   ```

3. **添加清晰的注释说明**
   - 标注字段 owner
   - 将字段声明放在实际读写该缓存键的包或项目里
   - 指明基础扩展点的文件位置

### ❌ DON'T - 错误做法

1. **不要重复其他 owner 已声明的字段**

   ```typescript
   // ❌ 错误:重复了 admin-theme 中已有的字段
   interface Local {
     themeSettings: Theme.ThemeSetting;
     dashboardLayout?: string; // ✅ 项目特定字段
   }
   ```

2. **不要使用 `export type`(会破坏全局声明)**

   ```typescript
   // ❌ 错误:导出为模块类型,无法全局访问
   declare namespace StorageType { ... }
   export type { StorageType };
   ```

3. **不要省略 `export {}`**
   ```typescript
   // ❌ 错误:文件被视为脚本而非模块
   declare global {
     namespace StorageType { ... }
   }
   // 缺少 export {};
   ```

## 适用场景

这种模式适合:

- ✅ **跨项目共享**的基础扩展点(Storage, Router, I18n 等)
- ✅ **项目特定**的扩展字段(admin 的 workspace, mobile 的设备信息等)
- ✅ **多租户/多模块**架构

不适合:

- ❌ 项目完全独立,无类型共享需求
- ❌ 需要严格的类型隔离(此时应使用显式导入)

## 其他可扩展的 Namespace

项目中所有以 `declare global` 声明的 namespace 都支持这种扩展模式:

- `Common` - 通用类型
- `StorageType` - 存储类型
- `I18n` - 国际化类型
- `Theme` - 主题类型
- `App` - 应用类型
- `UnionKey` - 联合键类型

## TypeScript 配置要求

确保 `tsconfig.json` 包含类型引用:

```json
{
  "compilerOptions": {
    "types": ["@skyroc/types/types"]
  }
}
```

这样 TypeScript 会自动加载 `@skyroc/types` 的全局声明并与项目扩展合并。
