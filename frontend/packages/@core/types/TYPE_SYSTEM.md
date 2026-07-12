# @skyroc/types 类型系统说明

## 📦 类型声明格式

所有类型文件统一使用 `declare global` 格式,确保类型在整个项目中全局可用。

### 标准格式

```typescript
/** The namespace description */
declare global {
  namespace NamespaceName {
    // Type definitions here
  }
}

export {};
```

### 关键要点

1. **使用 `declare global`**: 将类型声明为全局可用
2. **末尾添加 `export {}`**: 确保文件被视为模块
3. **添加顶部注释**: 描述命名空间用途
4. **不使用 `export type`**: 全局声明不需要显式导出

## 📂 命名空间组织

### App 层命名空间

#### `Common`

- **文件**: `src/app/common.d.ts`
- **用途**: 通用类型(Option, YesOrNo, EnableStatus 等)
- **访问**: 全局直接使用,无需导入

```typescript
const option: Common.Option = { label: 'Label', value: 'value' };
```

#### `Menu`

- **文件**: `src/app/menu.d.ts`
- **用途**: 菜单类型
- **访问**: 全局直接使用

```typescript
const menu: Menu.CommonMenu = { ... };
```

#### `Router`

- **文件**: `src/app/router.d.ts`
- **用途**: 路由类型
- **访问**: 全局直接使用

```typescript
const meta: Router.Meta = { ... };
```

#### `App.Global`

- **文件**: `src/app/global.d.ts`
- **用途**: 全局应用类型
- **访问**: 全局直接使用

```typescript
const tab: App.Global.Tab = { ... };
```

#### `UnionKey`

- **文件**: `src/app/union-key.d.ts`
- **用途**: 联合类型键
- **访问**: 全局直接使用

```typescript
type ThemeTabMode = UnionKey.ThemeTabMode; // 'button' | 'chrome' | 'slider'
```

#### `StorageType`

- **文件**: `src/app/storage.d.ts`
- **用途**: 存储类型扩展点
- **访问**: 全局直接使用,具体字段由拥有该缓存键的包或项目扩展

```typescript
const storage: StorageType.Local = { ... };
```

`@skyroc/types` 只声明空的 `StorageType.Local` / `StorageType.Session` 扩展点。比如 `@skyroc/web-admin-theme` 声明 `themeSettings`，`@skyroc/web-admin-layouts` 声明 `globalTabs`，具体项目声明 `token`、`lang` 等项目级键。

### API 层命名空间

#### `Api.Service`

- **文件**: `src/api/service.d.ts`
- **用途**: 服务配置和响应类型
- **访问**: 全局直接使用

```typescript
const response: Api.Service.Response<DataType> = { ... };
```

#### `Api.Auth`

- **文件**: `src/api/auth.d.ts`
- **用途**: 认证相关类型
- **访问**: 全局直接使用

```typescript
const loginParams: Api.Auth.LoginParams = { ... };
```

#### `Api.Route`

- **文件**: `src/api/route.d.ts`
- **用途**: 路由 API 类型
- **访问**: 全局直接使用

```typescript
const routes: Api.Route.BackendRoute[] = [ ... ];
```

#### `Api.Common`

- **文件**: `src/api/common.d.ts`
- **用途**: API 通用类型
- **访问**: 全局直接使用

```typescript
const params: Api.Common.PaginatingCommonParams = { ... };
```

#### `Api.SystemManage`

- **文件**: `src/api/system-manage.d.ts`
- **用途**: 系统管理模块接口类型
- **访问**: 全局直接使用

```typescript
const params: Api.SystemManage.UserSearchParams = { ... };
```

### 国际化命名空间

#### `I18n`

- **文件**: `src/locales/i18n.d.ts`
- **用途**: 国际化类型
- **访问**: 全局直接使用

```typescript
const key: I18n.I18nKey = 'common.action';
```

## 🔧 使用方式

### 1. 全局类型使用(推荐)

由于使用 `declare global`,所有类型无需导入即可直接使用:

```typescript
// ✅ 直接使用,无需导入
const option: Common.Option = { label: 'Option 1', value: '1' };
const user: Api.Auth.UserInfo = { ... };
```

### 2. 显式导入使用(可选)

如果需要明确依赖关系,也可以显式导入:

```typescript
import type { Common, Api } from '@skyroc/types';

const option: Common.Option = { label: 'Option 1', value: '1' };
```

### 3. 项目扩展

在具体项目中扩展全局类型:

```typescript
// apps/admin/src/types/storage.d.ts
declare global {
  namespace StorageType {
    interface Local {
      // 项目特定字段
      dashboardLayout?: 'grid' | 'list';
    }
  }
}

export {};
```

## 📋 命名空间层级

```
global
├── Common                    # 通用类型
├── Menu                      # 菜单类型
├── Router                    # 路由类型
├── UnionKey                  # 联合键
├── StorageType               # 存储类型
├── I18n                      # 国际化，含 LocaleMessages 扩展点
├── App.Global                # 全局应用类型
│   └── AdminLayout           # 管理布局
└── Api                       # API 命名空间
    ├── Service               # 服务配置
    ├── Auth                  # 认证
    ├── Route                 # 路由 API
    └── Common                # 通用 API
```

## ✅ 优势

1. **零导入**: 全局类型无需导入,提高开发效率
2. **统一格式**: 所有类型文件使用相同格式,易于维护
3. **可扩展**: 支持项目级别的类型扩展
4. **类型安全**: TypeScript 声明合并确保类型一致性
5. **清晰组织**: 命名空间层级清晰,易于查找

## 🚫 注意事项

1. **不要在类型文件中使用 `export type { NamespaceName }`**
   - 使用 `export {}` 即可

2. **始终使用 `declare global`**
   - 不要使用 `declare namespace` 后再导出

3. **保持命名空间层级**
   - 使用点号分隔(如 `Api.Auth`, `App.Global`)
   - 保持命名一致性

4. **扩展时使用相同格式**
   - 项目扩展也要使用 `declare global`
   - 末尾添加 `export {}`

---

**最后更新**: 2026-01-25
