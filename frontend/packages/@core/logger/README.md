# @skyroc/logger

基于 [LogLayer](https://loglayer.dev) 的跨平台统一日志库，支持 Web、React Native 和小程序环境。

## 特性

- 🌍 **跨平台支持**：Web（IndexedDB）、React Native（AsyncStorage）、小程序（FileSystemManager）
- 📝 **开发/生产模式**：开发环境输出到控制台，生产环境存储到本地
- 🔐 **设备白名单**：通过后端接口控制哪些设备启用日志上传
- 📤 **批量上传**：支持分批上传历史日志到远程服务器
- 🗑️ **自动清理**：默认保留 7 天日志，自动清理过期数据
- 🔧 **高度可配置**：支持自定义存储适配器、上传端点、保留时间等

## 安装

```bash
pnpm add @skyroc/logger
```

## 基础用法

### 初始化日志实例

```typescript
import { createLogger } from '@skyroc/logger';

// 创建日志实例
const { logger, dispose } = await createLogger({
  // 日志保留天数，默认 7 天
  retentionDays: 7,
  // 白名单检查端点
  whitelistEndpoint: '/api/log/whitelist',
  // 日志上传端点
  uploadEndpoint: '/api/log/upload'
});

// 使用日志
logger.info('Application started');
logger.warn('Warning message');
logger.error('Error occurred');

// 带附加数据
logger.withMetadata({ userId: '123' }).info('User action');

// 带错误对象
logger.withError(new Error('Something went wrong')).error('Operation failed');

// 带上下文
const contextLogger = logger.withContext({ module: 'auth' });
contextLogger.info('Login attempt');

// 应用关闭时销毁
dispose();
```

### 简单的控制台日志（不带存储）

```typescript
import { createConsoleLogger } from '@skyroc/logger';

const logger = createConsoleLogger();
logger.info('Hello, world!');
```

## 配置选项

| 选项                     | 类型                                        | 默认值           | 说明                 |
| ------------------------ | ------------------------------------------- | ---------------- | -------------------- |
| `platform`               | `'web' \| 'react-native' \| 'mini-program'` | 自动检测         | 运行平台             |
| `isDev`                  | `boolean`                                   | 自动检测         | 是否开发模式         |
| `retentionDays`          | `number`                                    | `7`              | 日志保留天数         |
| `whitelistEndpoint`      | `string`                                    | -                | 白名单检查接口       |
| `uploadEndpoint`         | `string`                                    | -                | 日志上传接口         |
| `whitelistCheckInterval` | `number`                                    | `300000` (5分钟) | 白名单检查间隔       |
| `uploadBatchSize`        | `number`                                    | `100`            | 批量上传大小         |
| `flushInterval`          | `number`                                    | `5000`           | 日志刷新间隔         |
| `enableStorageInDev`     | `boolean`                                   | `false`          | 开发模式是否启用存储 |
| `storageAdapter`         | `IStorageAdapter`                           | -                | 自定义存储适配器     |

## API 接口设计

### 白名单检查接口

**请求**

```http
POST /api/log/whitelist
Content-Type: application/json

{
  "deviceId": "unique-device-id"
}
```

**响应**

```json
{
  "enabled": true,
  "deviceIds": ["device-1", "device-2", "device-3"]
}
```

### 日志上传接口

**请求**

```http
POST /api/log/upload
Content-Type: application/json

{
  "deviceId": "unique-device-id",
  "logs": [
    {
      "id": "log-id",
      "timestamp": 1706745600000,
      "level": "info",
      "message": "User logged in",
      "data": { "userId": "123" },
      "context": { "module": "auth" }
    }
  ],
  "batchIndex": 0,
  "totalBatches": 3
}
```

**响应**

```json
{
  "success": true,
  "receivedCount": 100,
  "message": "Logs received successfully"
}
```

## 高级用法

### 手动触发上传

```typescript
const { uploadLogs } = await createLogger(config);

// 手动上传所有日志
const result = await uploadLogs();
console.log(`Uploaded ${result?.uploadedCount} logs`);
```

### 手动触发清理

```typescript
const { cleanupLogs } = await createLogger(config);

// 手动清理过期日志
const deletedCount = await cleanupLogs();
console.log(`Deleted ${deletedCount} old logs`);
```

### 自定义存储适配器

```typescript
import { BaseStorageAdapter, createLogger } from '@skyroc/logger';

class MyCustomAdapter extends BaseStorageAdapter {
  async init() {
    // 初始化逻辑
  }

  async write(record) {
    // 写入逻辑
  }

  async writeBatch(records) {
    // 批量写入逻辑
  }

  async read(startTime, endTime) {
    // 读取逻辑
    return [];
  }

  async deleteBeforeTime(time) {
    // 删除逻辑
    return 0;
  }

  async count() {
    // 计数逻辑
    return 0;
  }

  async clear() {
    // 清空逻辑
  }
}

const { logger } = await createLogger({
  storageAdapter: new MyCustomAdapter()
});
```

## 在 React 中使用

### 使用 Provider

```tsx
import { LoggerProvider } from '@/features/logger/LoggerProvider';

function App() {
  return (
    <LoggerProvider>
      <YourApp />
    </LoggerProvider>
  );
}
```

### 使用快捷方法

```typescript
import { log, createContextLogger } from '@/features/logger';

// 快捷日志方法
await log.info('User action', { userId: '123' });
await log.error('Operation failed', new Error('timeout'));

// 带模块上下文的日志
const authLogger = await createContextLogger('auth');
authLogger.info('Login successful');
```

## 平台支持

### Web

使用 IndexedDB 存储日志，支持所有现代浏览器。

### React Native

需要安装 `@react-native-async-storage/async-storage`：

```bash
pnpm add @react-native-async-storage/async-storage
```

### 小程序

支持以下小程序平台：

- 微信小程序 (wx)
- 支付宝小程序 (my)
- 抖音小程序 (tt)
- 百度小程序 (swan)
- QQ小程序 (qq)

使用文件系统存储日志（JSONL 格式）。

## 许可证

MIT
