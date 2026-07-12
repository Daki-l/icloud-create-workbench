# @skyroc/core-state

基于 Jotai 的状态管理封装 — 存储解耦、跨平台、支持 React 组件外访问。

## 架构

```
应用层                             @core/state
─────────────────────────          ──────────────────────────────────
registerStorage('local', ...)  ──► StorageRegistry (Map<name, adapter>)
registerStorage('session', ...)    │
                                   ▼
<JotaiProvider>                    globalStore (createStore)
  └─ <Provider store={globalStore}>
                                   ▼
createAtomWithStorage(key, val) ─► getStorage('local') ─► jotaiAtomWithStorage
atomWithPartial(initialValue)  ─► baseAtom + 派生读写原子（合并 + no-op 检测）

getAtomValue / setAtomValue    ─► globalStore.get / globalStore.set
updateAtomValue                ─► globalStore.get + globalStore.set（函数式）
```

## 设计原则

1. **存储注册表** — `registerStorage` / `getStorage` 解耦存储实现，`@core/state` 不依赖任何具体平台 API
2. **应用层注册** — 应用层在入口注册 `'local'`、`'session'` 等适配器，库代码通过名称引用
3. **直传逃生舱** — `options.storage` 允许直传适配器，跳过注册表
4. **非 Hook 访问** — `globalStore` + `getAtomValue` / `setAtomValue` 用于 axios 拦截器等非组件场景
5. **无操作跳过** — `atomWithPartial` 在补丁字段全部 `Object.is` 相等时跳过写入，不触发订阅者

## 使用方式

### 1. 注册存储适配器（应用入口）

```ts
import { registerStorage } from '@skyroc/core-state';
import { storage } from '@skyroc/storage';

// localStorage 适配器
registerStorage('local', {
  getItem: key => storage.get(key),
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.remove(key),
});

// sessionStorage 适配器
registerStorage('session', {
  getItem: key => {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },
  setItem: (key, value) => sessionStorage.setItem(key, JSON.stringify(value)),
  removeItem: key => sessionStorage.removeItem(key),
});
```

### 2. 挂载 Provider

```tsx
import { JotaiProvider } from '@skyroc/core-state';

const App = () => (
  <JotaiProvider>
    <YourApp />
  </JotaiProvider>
);
```

> **注意**：`JotaiProvider` 将 `<Provider>` 绑定到 `globalStore`。若不挂载，组件内 `useAtom` 使用 Jotai 默认隐式 store，与 `getAtomValue` / `setAtomValue` 的 globalStore 不同步。

### 3. 创建持久化原子

```ts
import { createAtomWithStorage } from '@skyroc/core-state';

// 默认使用 'local' 存储
const themeAtom = createAtomWithStorage('theme', { mode: 'light' });

// 使用 session 存储
const tabAtom = createAtomWithStorage('activeTab', 'home', { storageName: 'session' });

// 直传适配器，绕过注册表
const customAtom = createAtomWithStorage('key', defaultVal, { storage: myAdapter });

// SSR：禁用初始化同步读取，避免 hydration 不一致
const ssrAtom = createAtomWithStorage('key', val, { getOnInit: false });
```

### 4. 部分更新原子

```ts
import { atomWithPartial } from '@skyroc/core-state';

const uiAtom = atomWithPartial({ siderCollapse: false, mixSiderFixed: false });

// 在组件中使用
const [ui, setUi] = useAtom(uiAtom);
setUi({ siderCollapse: true });                          // 补丁形式
setUi(prev => ({ siderCollapse: !prev.siderCollapse })); // updater 函数形式
setUi({ siderCollapse: true }); // 值未变 → 无操作，不触发重渲染
```

### 5. 非 Hook 访问

```ts
import { getAtomValue, setAtomValue, updateAtomValue } from '@skyroc/core-state';

// 如 axios 拦截器中读取 token
const token = getAtomValue(authAtom);

// 直接写入
setAtomValue(authAtom, newAuthState);

// 同样支持 atomWithPartial
setAtomValue(uiAtom, { siderCollapse: true });

// 函数式更新（仅适用于写签名为 [Value] 的普通原子）
updateAtomValue(counterAtom, prev => prev + 1);
```

### 6. 跨标签页同步（可选）

实现 `AtomStorage.subscribe` 可将浏览器 `storage` 事件推送到原子：

```ts
registerStorage('local', {
  getItem: key => JSON.parse(localStorage.getItem(key) ?? 'null'),
  setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  removeItem: key => localStorage.removeItem(key),
  subscribe: (key, callback) => {
    const handler = (e: StorageEvent) => {
      if (e.key === key) callback(e.newValue ? JSON.parse(e.newValue) : null);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
});
```

## API

### Provider（Provider 组件）

| 导出            | 说明                              |
| --------------- | --------------------------------- |
| `JotaiProvider` | Provider 组件，内置 `globalStore` |

### Store（全局 Store）

| 导出                          | 说明                                    |
| ----------------------------- | --------------------------------------- |
| `globalStore`                 | 全局 Jotai store 实例                   |
| `getAtomValue(atom)`          | 非 Hook 环境读取 atom                   |
| `setAtomValue(atom, ...args)` | 非 Hook 环境写入 atom（任意写签名）     |
| `updateAtomValue(atom, fn)`   | 非 Hook 环境函数式更新 atom             |

### Utils（工具函数）

| 导出                                      | 说明                                             |
| ----------------------------------------- | ------------------------------------------------ |
| `createAtomWithStorage(key, init, opts?)` | 创建持久化 atom（注册表解析存储，含容错回退）    |
| `atomWithPartial(init)`                   | 创建支持部分更新的 atom（内置无操作跳过）        |
| `registerStorage(name, adapter)`          | 注册命名存储适配器                               |
| `getStorage(name)`                        | 获取已注册的存储适配器（未注册时抛出）           |
| `hasStorage(name)`                        | 检查名称是否已注册（不抛出）                     |
| `unregisterStorage(name)`                 | 移除注册，返回是否存在                           |
| `__clearStorageRegistry()`                | 清空全部注册（**仅测试使用**）                   |

### Types（类型导出）

| 导出                           | 说明                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `AtomStorage`                  | 存储适配器接口（`getItem` / `setItem` / `removeItem` / `subscribe?`）|
| `PartialUpdater<T>`            | `atomWithPartial` 的写参数类型（对象补丁或 updater 函数）     |
| `CreateAtomWithStorageOptions` | `createAtomWithStorage` 的 options 类型                        |
| `JotaiProviderProps`           | `JotaiProvider` 的 props 类型                                  |

## 许可证

MIT
