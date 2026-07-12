# @skyroc/utils

平台无关的通用工具函数集，提供日期处理、加密、存储封装、ID 生成、数组/对象操作等基础能力，并通过独立子路径暴露浏览器专用工具。

## 两个入口

| 入口 | 导入路径 | 适用环境 |
| --- | --- | --- |
| 主入口 | `@skyroc/utils` | 平台无关（Node.js / 浏览器 / SSR 均可） |
| Web 子路径 | `@skyroc/utils/web` | 仅浏览器环境 |

## 安装

包已在 monorepo 内，直接引用：

```ts
import { cn, nanoid, isNil, formatDate } from '@skyroc/utils';
import { downloadFileFromUrl, openWindow } from '@skyroc/utils/web';
```

## 模块一览

| 模块 | 主要导出 | 说明 |
| --- | --- | --- |
| `cn` | `cn` | Tailwind class 合并（clsx + tailwind-merge） |
| `crypto` | `Crypto` | AES 对称加密/解密类 |
| `nanoid` | `nanoid` | URL 安全唯一 ID 生成 |
| `klona` | `jsonClone` | JSON 安全深拷贝 |
| `storage` | `createStorage`, `createLocalforage` | 类型安全存储封装 |
| `date` | `formatDate`, `addDate` 等 20+ 函数 | 分层日期工具（格式化/运算/边界/比较） |
| `array` | `toArray`, `arraysEqual` | 数组规范化与无序等价比较 |
| `reg` | `REG_USER_NAME` 等 7 个正则 | 常用表单校验正则常量 |
| `object` | `shallowEqual`, `diffObject` 等 | 对象浅比较与递归 diff |
| `utils` | `isNil`, `isMacOs` 等 | 基础类型守卫与环境检测 |
| `emitter` | `Emitter` | 轻量级类型安全事件总线 |
| `createSubject` | `createSubject` | 轻量 RxJS Subject 实现 |
| `priority-queue` | `PriorityQueue` | 泛型优先级队列（ID 去重 + 变更订阅） |
| `singleflight` | `Singleflight`, `createSingleflight` | 合并同 key 的并发请求 |
| `radash` | 全部 radash 导出 | 函数式工具集（re-export） |
| `web/download` | `downloadFileFromUrl` 等 | 多策略文件下载（仅浏览器） |
| `web/window` | `openWindow` | 安全新窗口打开（仅浏览器） |
| `web/class` | `toggleHtmlClass` | HTML class 切换（仅浏览器） |

---

## cn — Tailwind class 合并

组合 [clsx](https://github.com/lukeed/clsx) 与 [tailwind-merge](https://github.com/dcastil/tailwind-merge)：先条件组合，再解决 Tailwind 工具类冲突。

```ts
import { cn } from '@skyroc/utils';

cn('px-4 py-2', 'px-6');
// 'py-2 px-6'（px-4 被 px-6 覆盖）

cn('text-red-500', { 'font-bold': true, 'text-blue-500': false });
// 'text-red-500 font-bold'
```

---

## Crypto — AES 加密

泛型加密类，基于 [crypto-js](https://github.com/brix/crypto-js) AES 实现，常用于本地存储敏感数据的加密保护。

```ts
import { Crypto } from '@skyroc/utils';

type TokenPayload = { accessToken: string; expiresAt: number };

const crypto = new Crypto<TokenPayload>(import.meta.env.VITE_CRYPTO_SECRET);

const cipher = crypto.encrypt({ accessToken: 'eyJ...', expiresAt: Date.now() + 3600_000 });
const payload = crypto.decrypt(cipher); // TokenPayload | null
```

**工作原理：** `T → JSON.stringify → AES.encrypt(key) → 密文字符串`，解密反向执行，失败时返回 `null`（不抛出异常）。

**安全注意：** 适合本地存储混淆，不适合替代 HTTPS 传输层加密。密钥应从环境变量读取，不要硬编码在源码中。

---

## nanoid — 唯一 ID 生成

直接 re-export 自 [nanoid](https://github.com/ai/nanoid)，生成 URL 安全的随机唯一字符串。

```ts
import { nanoid } from '@skyroc/utils';

nanoid();    // 'V1StGXR8_Z5jdHi6B-myT'（默认 21 位）
nanoid(10);  // 'IRFa-VaY2b'（指定长度）
```

---

## jsonClone — JSON 安全深拷贝

来自 [klona/json](https://github.com/lukeed/klona)，基于 JSON 序列化的快速深拷贝。

```ts
import { jsonClone } from '@skyroc/utils';

const original = { a: 1, b: { c: [2, 3] } };
const clone = jsonClone(original);

clone.b.c.push(4);
console.log(original.b.c); // [2, 3]（不受影响）
```

**限制：** `Date`、`Map`、`Set`、`Function`、`undefined` 等非 JSON 可序列化类型会丢失或变形。

---

## Storage — 类型安全存储

### createStorage

类型安全的 `localStorage` / `sessionStorage` 封装，支持泛型约束与 key 前缀。

```ts
import { createStorage } from '@skyroc/utils';

type AppStorage = {
  token: string;
  userInfo: { id: number; name: string };
  theme: 'light' | 'dark';
};

const storage = createStorage<AppStorage>('local', 'app__');

storage.set('token', 'eyJ...');
const token = storage.get('token'); // string | null
storage.remove('token');
storage.clear();
```

`get()` 在 JSON 解析失败时自动删除该 key 并返回 `null`，支持 `false`、`0` 等 falsy 值的正确读取。

### createLocalforage

基于 [localforage](https://localforage.github.io/localForage/) 的异步存储封装，支持 IndexedDB / WebSQL / localStorage。

```ts
import { createLocalforage } from '@skyroc/utils';

type CacheStorage = {
  dashboardData: { charts: unknown[]; updatedAt: number };
};

const cache = createLocalforage<CacheStorage>('indexedDB');

await cache.setItem('dashboardData', { charts: [], updatedAt: Date.now() });
const data = await cache.getItem('dashboardData'); // CacheStorage['dashboardData'] | null
```

**选型建议：**

| 场景 | 推荐 |
| --- | --- |
| 同步读写，数据量小 | `createStorage('local', ...)` |
| 仅当前 tab 生命周期 | `createStorage('session', ...)` |
| 大体积数据（> 5MB） | `createLocalforage('indexedDB')` |

---

## Date — 分层日期工具

基于 [dayjs](https://day.js.org/)，注册了 `duration` 与 `relativeTime` 插件。所有函数接受 `DateInput` 类型：

```ts
type DateInput = string | number | Date | dayjs.Dayjs | null | undefined;
```

函数按**操作意图**分四个职责层：

```
format.ts   → 返回 string，结果用于 UI 渲染
calc.ts     → 返回 Dayjs / number，结果用于后续计算
boundary.ts → 返回 Dayjs / [Dayjs, Dayjs]，表示时间区间
compare.ts  → 返回 boolean，用于条件判断
```

### DATE_FORMAT 常量

```ts
import { DATE_FORMAT } from '@skyroc/utils';

DATE_FORMAT.DATE             // 'YYYY-MM-DD'
DATE_FORMAT.DATE_TIME        // 'YYYY-MM-DD HH:mm:ss'
DATE_FORMAT.DATE_TIME_MINUTE // 'YYYY-MM-DD HH:mm'
DATE_FORMAT.TIME             // 'HH:mm:ss'
DATE_FORMAT.DATE_CN          // 'YYYY年MM月DD日'
```

### format — 格式化

```ts
import { formatDate, formatDateTime, formatTime, fromTimestamp, formatDuration, humanizeDuration } from '@skyroc/utils';

formatDate(new Date());                          // '2026-04-22'
formatDateTime(new Date());                      // '2026-04-22 14:30:00'
formatTime(new Date());                          // '14:30:00'
fromTimestamp(1745000000);                       // 秒级自动转毫秒
fromTimestamp(1745000000000);                    // 毫秒级直接使用
formatDuration(3661000);                         // '01:01:01'
humanizeDuration(86400000);                      // 'a day'
```

### calc — 运算

```ts
import { toTimestamp, toUnixTimestamp, addDate, subtractDate, diffDate, fromNow, toNow } from '@skyroc/utils';

toTimestamp('2026-04-22');                       // 毫秒级时间戳
toUnixTimestamp('2026-04-22');                   // 秒级时间戳
addDate('2026-04-22', 7).format('YYYY-MM-DD');  // '2026-04-29'
subtractDate('2026-04-22', 1, 'month');          // 上个月同日
diffDate('2026-04-22', '2026-04-01');            // 21（天）
fromNow('2026-04-19');                           // '3 days ago'
```

### boundary — 边界与范围

```ts
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  getTodayRange, getYesterdayRange,
  getThisWeekRange, getThisMonthRange,
  getThisYearRange, getLastDaysRange,
} from '@skyroc/utils';

const [start, end] = getThisMonthRange(); // 本月起止
const [from, to] = getLastDaysRange(7);   // 最近 7 天
```

### compare — 比较

```ts
import { isValidDate, isBefore, isAfter, isSame, isToday, isYesterday, isTomorrow } from '@skyroc/utils';

isValidDate('2026-04-22');                           // true
isBefore('2026-04-01', '2026-04-22');               // true
isSame('2026-04-22 10:00', '2026-04-22 15:00', 'day'); // true
isToday(new Date());                                 // true
```

---

## Array — 数组工具

### toArray

将"单值 / 数组 / null / undefined"三种形态统一规范化为数组。

```ts
import { toArray } from '@skyroc/utils';

toArray('hello');    // ['hello']
toArray(['a', 'b']); // ['a', 'b']
toArray(null);       // []
toArray(undefined);  // []
toArray(0);          // [0]（非 nil 的 falsy 值也会被包裹）
```

### arraysEqual

无序判断两个数组的元素集合是否等价（基于 Map 计数，`O(n)` 时间复杂度，浅比较）。

```ts
import { arraysEqual } from '@skyroc/utils';

arraysEqual([1, 2, 3], [3, 2, 1]); // true（顺序无关）
arraysEqual([1, 1, 2], [1, 2, 2]); // false（计数不同）
arraysEqual([], []);                // true
```

---

## Regex — 校验正则

7 个预定义正则常量，均为非全局模式（无 `g` 标志），可安全复用于 `test()`。

```ts
import { REG_USER_NAME, REG_PHONE, REG_PWD, REG_EMAIL, REG_CODE_SIX, REG_CODE_FOUR, REG_URL } from '@skyroc/utils';
```

| 常量 | 规则 | 合法示例 |
| --- | --- | --- |
| `REG_USER_NAME` | 4-16 位：中文/英文/数字/`_`/`-` | `alice_01`、`张三` |
| `REG_PHONE` | 中国大陆 11 位手机号 | `13812345678` |
| `REG_PWD` | 6-18 位：字母/数字/`_` | `pass_123` |
| `REG_EMAIL` | 标准邮箱格式 | `user@example.com` |
| `REG_CODE_SIX` | 恰好 6 位纯数字 | `123456` |
| `REG_CODE_FOUR` | 恰好 4 位纯数字 | `1234` |
| `REG_URL` | HTTP / HTTPS URL | `https://example.com/path?q=1` |

```ts
// 与 Zod 配合使用
const loginSchema = z.object({
  phone: z.string().regex(REG_PHONE, '手机号格式不正确'),
  password: z.string().regex(REG_PWD, '密码为 6-18 位字母、数字或下划线'),
});
```

---

## object — 对象工具

```ts
import { shallowEqual, diffObject, isObjectType, isEventObject } from '@skyroc/utils';
```

### shallowEqual(a, b) → boolean

浅比较：先用 `Object.is` 判断引用，再逐键用 `Object.is` 比较一级属性值。

```ts
shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 });             // true
shallowEqual({ a: 1, b: { c: 3 } }, { a: 1, b: { c: 3 } }); // false（嵌套对象引用不同）
```

### diffObject\<T\>(obj1, obj2) → Partial\<T\>

递归计算两个对象的差异，返回 `obj2` 中与 `obj1` 不同的部分。命名为 `diffObject` 以与 radash 的数组 `diff` 区分。

```ts
diffObject({ name: 'Alice', age: 30 }, { name: 'Alice', age: 31 });
// { age: 31 }
```

---

## utils — 基础工具

```ts
import { noop, isNil, isHttpUrl, isWindow, isMacOs, isWindowsOs, isPC } from '@skyroc/utils';
```

| 函数 | 说明 |
| --- | --- |
| `noop()` | 空函数，用作可选回调的默认值 |
| `isNil(val)` | 类型守卫：`null \| undefined` |
| `isHttpUrl(url)` | 判断是否以 `http://` 或 `https://` 开头 |
| `isWindow(value)` | 类型守卫：是否为 `window` 对象 |
| `isMacOs()` | 检测 macOS 环境（依赖 `navigator`） |
| `isWindowsOs()` | 检测 Windows 环境（依赖 `navigator`） |
| `isPC()` | 检测 PC 端（非移动设备） |

```ts
// 快捷键按系统区分
const modKey = isMacOs() ? e.metaKey : e.ctrlKey;

// 菜单项外部链接判断
if (isHttpUrl(path)) {
  openWindow(path);
} else {
  router.push(path);
}
```

---

## Emitter — 事件总线

轻量级发布/订阅实现，支持泛型事件映射、通配符监听、粘性事件与键控隔离。

```ts
import { Emitter } from '@skyroc/utils';

type AppEvents = {
  login: [user: string, timestamp: number];
  logout: [];
};

const bus = new Emitter<AppEvents>();

const off = bus.on('login', (user, timestamp) => {
  console.log(`${user} 登录于 ${timestamp}`);
});

bus.emit('login', 'alice', Date.now());
off(); // 取消订阅
```

### 核心特性

**通配符监听：** `bus.on('*', (eventName, ...args) => {})` 接收所有事件，适合日志调试。

**粘性事件：** 触发时若无监听器，参数会被暂存；晚注册的监听器调用 `on()` 时会立即收到积压的调用。

**键控事件（Map 模式）：** `onMap / emitMap` 在事件名之外再加一层 `key` 隔离，适合同一事件按实例区分的场景。

```ts
bus.onMap('update', 'panel-A', (data) => {});
bus.emitMap('update', 'panel-A', { value: 1 }); // 只触发 panel-A
```

### API 汇总

| 方法 | 说明 |
| --- | --- |
| `emit(event, ...args)` | 触发事件 |
| `emitMap(event, key, ...args)` | 触发键控事件 |
| `on(event, fn)` | 注册监听器，返回取消订阅函数 |
| `onMap(event, key, fn)` | 注册键控监听器 |
| `off(event, fn?)` | 移除监听器，不传 `fn` 则移除该事件所有监听器 |
| `offMap(event, key, fn)` | 移除键控监听器 |
| `offAll()` | 清除所有监听器和粘性事件缓存 |

---

## createSubject — 轻量 Subject

简化版 [RxJS Subject](https://rxjs.dev/guide/subject)，用于多播值推送与模块间单向数据流。Subject 既是生产者（可 `next` 推送值），也是消费者（可被 `subscribe` 订阅）。

```ts
import { createSubject } from '@skyroc/utils';

const subject = createSubject<string>();

const sub = subject.subscribe(value => console.log(value));
subject.next('hello'); // 推送给所有订阅者
sub.unsubscribe();

subject.complete(); // 关闭，之后 next() 无效
```

| 方法 | 说明 |
| --- | --- |
| `next(value)` | 向所有活跃订阅者推送值 |
| `subscribe(fn \| observer)` | 注册订阅者，返回 `{ unsubscribe }` |
| `unsubscribe()` | 移除所有订阅者（不关闭） |
| `complete()` | 关闭 Subject |
| `hasObservers()` | 是否有活跃订阅者 |
| `closed` | 是否已关闭（只读） |
| `size` | 当前订阅者数量（只读） |

**与 Emitter 的选择：** 需要多个不同具名事件 → `Emitter`；只需一条单类型数据流 → `createSubject`。

---

## PriorityQueue — 优先级队列

泛型优先级队列，核心能力：**ID 去重**、**外部排序策略**、**变更订阅**、**惰性缓存**。

```ts
import { PriorityQueue } from '@skyroc/utils';

type Task = { taskId: string; priority: number; createdAt: number };

const queue = new PriorityQueue<Task>({
  getId: t => t.taskId,
  compare: (a, b) => a.priority - b.priority || a.createdAt - b.createdAt,
});

queue.enqueue({ taskId: '1', priority: 2, createdAt: 1000 });
queue.enqueue({ taskId: '2', priority: 1, createdAt: 2000 });
queue.enqueue({ taskId: '1', priority: 2, createdAt: 1000 }); // 重复，被忽略

queue.peek()?.taskId; // '2'（priority 1 优先）
queue.dequeue();      // 取出 taskId='2'
```

### 写操作

| 方法 | 说明 | 返回 |
| --- | --- | --- |
| `enqueue(item)` | 单条入队（幂等，id 存在则跳过） | `boolean` |
| `enqueueMany(items)` | 批量入队，触发一次排序 | `number`（实际入队数） |
| `dequeue()` | 移除并返回队首 | `T \| undefined` |
| `remove(id)` | 按 id 移除 | `boolean` |
| `removeBy(predicate)` | 按条件批量移除 | `number`（实际移除数） |
| `clear()` | 清空队列 | `void` |

### 读操作与订阅

```ts
queue.peek();        // 查看队首，不移除
queue.has('id');     // 是否存在
queue.get('id');     // 按 id 获取
queue.toArray();     // 完整有序快照（readonly）
queue.size;          // 数量
queue.isEmpty;       // 是否为空

// 变更订阅（适配 Jotai / Zustand）
const unsub = queue.subscribe(sorted => {
  store.set(queueAtom, [...sorted]);
});
unsub(); // 取消
```

支持 `for...of` 按优先级顺序遍历。

---

## Singleflight — 并发请求合并

合并同 key 的并发请求，保证相同 key 在飞行期间只有一个 Promise，结果共享给所有调用方。来自 Go 标准库的同名模式。

### 类形式 — 在 Service 中组合

```ts
import { Singleflight } from '@skyroc/utils';

class UserService {
  private sf = new Singleflight();

  fetchProfile(id: string) {
    return this.sf.do(`profile:${id}`, () =>
      fetch(`/api/users/${id}/profile`).then(r => r.json())
    );
  }
}

// 三次并发调用只实际发出一次请求
const [a, b, c] = await Promise.all([
  service.fetchProfile('alice'),
  service.fetchProfile('alice'),
  service.fetchProfile('alice'),
]);
```

### 工厂函数形式 — 模块级

```ts
import { createSingleflight } from '@skyroc/utils';

const sf = createSingleflight();

async function fetchConfig() {
  return sf('app-config', () => fetch('/api/config').then(r => r.json()));
}
```

### API

| 方法 | 说明 |
| --- | --- |
| `sf.do(key, fn)` | 执行 fn，相同 key 飞行期间共享 Promise，落定后缓存自动清除 |
| `sf.forget(key)` | 手动清除某 key 的缓存，强制下次重新执行 |
| `sf.reset()` | 清除所有缓存 |

---

## radash — 函数式工具集

完整 re-export [radash](https://radash-docs.vercel.app/) 的所有导出，可直接从 `@skyroc/utils` 导入。

```ts
import { group, unique, omit, pick, diff, sleep, retry } from '@skyroc/utils';
```

> **注意：** radash 的 `diff` 是**数组差集**工具（返回第一个数组中不在第二个数组里的元素），本包的对象递归比较函数已重命名为 `diffObject` 以避免歧义。

---

## @skyroc/utils/web — 浏览器专用工具

通过独立子路径导入，避免在 Node.js / SSR 环境中意外引入 BOM API。

```ts
import { downloadFileFromUrl, openWindow, toggleHtmlClass } from '@skyroc/utils/web';
```

### 文件下载

不同来源选择对应函数：

```
文件来源？
  ├─ 普通 URL（http/https）    → downloadFileFromUrl      （异步）
  ├─ 图片 URL（需转 base64）   → downloadFileFromImageUrl （异步）
  ├─ Base64 / DataURL          → downloadFileFromBase64   （同步）
  ├─ Blob 对象                 → downloadFileFromBlob     （同步）
  ├─ BlobPart（ArrayBuffer 等）→ downloadFileFromBlobPart （同步）
  └─ 自定义 href               → triggerDownload          （底层，同步）
```

#### downloadFileFromUrl — 内置跨平台兼容策略

1. iOS / iPadOS → 直接 `openWindow`（`a[download]` 在 iOS 上不可靠）
2. 桌面端，CORS 允许 → `fetch → blob → a[download]`（可自定义文件名）
3. 桌面端，CORS 不允许 → 回退 `openWindow`

文件名优先级：`Content-Disposition` 响应头 → 参数 `fileName` → URL 路径文件名。

```ts
await downloadFileFromUrl({ source: 'https://example.com/report.pdf' });

await downloadFileFromUrl({
  source: 'https://example.com/export?id=123',
  fileName: '月度报表.xlsx',
});
```

#### 其他下载函数

```ts
// Base64 / DataURL
downloadFileFromBase64({
  source: 'data:application/pdf;base64,JVBERi0x...',
  fileName: 'document.pdf',
});

// Blob（配合 axios responseType: 'blob'）
const response = await axios.get('/api/export', { responseType: 'blob' });
downloadFileFromBlob({ source: response.data, fileName: '数据导出.xlsx' });

// BlobPart（自构造内容）
downloadFileFromBlobPart({ source: 'name,age\nAlice,30', fileName: 'users.csv' });

// 图片 URL（Canvas 转 Base64，需服务端允许 CORS）
await downloadFileFromImageUrl({ source: 'https://cdn.example.com/avatar.png', fileName: 'avatar.png' });
```

### openWindow — 安全新窗口

```ts
openWindow('https://docs.example.com');                    // 新 tab（默认）
openWindow('/settings', { target: '_self' });              // 当前 tab
openWindow('https://external.com', { secure: false });     // 关闭安全策略
```

默认开启 `noopener,noreferrer` 防止 opener 劫持。

### toggleHtmlClass — HTML class 切换

常用于主题切换（暗色模式）。

```ts
const dark = toggleHtmlClass('dark');

dark.add();    // <html class="dark">
dark.remove(); // <html class="">
```

---

## 测试

```bash
# 从 monorepo 根目录
npx vitest run packages/@core/utils

# 或在包目录内
pnpm test

# 含覆盖率报告
pnpm test:coverage
```
