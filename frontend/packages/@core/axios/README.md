# @skyroc/axios

基于 [Axios](https://axios-http.com/) 的请求客户端工厂，提供类型安全的请求实例、业务错误处理、Token 刷新、请求取消等能力。

## 特性

- **两种请求风格**：`createRequest`（抛异常）和 `createFlatRequest`（Result 风格，不抛异常）
- **业务错误与 HTTP 错误的统一处理**
- **请求/响应拦截器钩子**（`onRequest`、`isBackendSuccess`、`onBackendFail`、`onError`、`transform`）
- **自动请求 ID**（每个请求携带唯一的 `X-Request-Id`）
- **请求取消管理**（`cancelAllRequest`）
- **可选的 axios-retry 重试机制**
- **响应类型推导**（`json`、`blob`、`text`、`arrayBuffer` 等）

## 安装

```bash
npm install @skyroc/axios
```

## 架构

```
用户调用 request(config)
    │
    ▼
┌─────────────────────────┐
│   请求拦截器             │
│  • 生成 X-Request-Id    │
│  • 挂载 AbortController │
│  • 调用 onRequest 钩子   │
└────────────┬────────────┘
             ▼
      Axios 发送请求
             │
             ▼
┌─────────────────────────┐
│   响应拦截器             │
│  • transformResponse    │
│  • 非 JSON 或业务成功    │──► 返回 response
│  • 业务失败              │
│    → onBackendFail      │
│    → onError → reject   │
└────────────┬────────────┘
             ▼
┌─────────────────────────┐
│ createRequest:           │
│   JSON → transform(res) │
│   其他 → response.data   │
├─────────────────────────┤
│ createFlatRequest:       │
│   成功 → { data, error: null }  │
│   失败 → { data: null, error }  │
└─────────────────────────┘
```

## 推荐用法

**推荐使用 `createRequest`**（抛异常风格），搭配 [TanStack Query](https://tanstack.com/query) 使用效果最佳：

```ts
// 1. 定义请求函数 —— 只关心「发请求 + 拿数据」
export function fetchUserList(params: Api.UserListParams) {
  return request<Api.UserList>({
    url: '/api/users',
    params,
  });
}

// 2. 封装 Query Hook —— TanStack Query 接管状态
export function useUserListQuery(params: Api.UserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => fetchUserList(params),
  });
}

// 3. 封装 Mutation Hook —— 写操作同理
export function useCreateUserMutation() {
  return useMutation({
    mutationFn: (data: Api.CreateUserParams) =>
      request<Api.User>({ url: '/api/users', method: 'post', data }),
  });
}

// 4. 在组件中使用
const UserList = () => {
  const { data, isLoading, error } = useUserListQuery({ page: 1 });
  const { mutate: createUser, isPending } = useCreateUserMutation();
  // ...
};
```

`createFlatRequest` 适合不使用 TanStack Query、需要手动控制错误流程的场景。

## API

### `createRequest`

创建一个**抛异常风格**的请求实例。业务失败或 HTTP 错误会抛出 `AxiosError`。

```ts
function createRequest<ResponseData, ApiData, State>(
  axiosConfig?: CreateAxiosDefaults,
  options?: Partial<RequestOption<ResponseData, ApiData, State>>
): RequestInstance<ApiData, State>
```

**类型参数：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `ResponseData` | 后端原始响应体类型 | `{ code: number; data: any; msg: string }` |
| `ApiData` | `transform` 转换后的业务数据类型 | `any` |
| `State` | 挂载在实例上的自定义状态类型 | `Record<string, unknown>` |

**示例：**

```ts
interface BackendResponse<T = any> {
  code: number;
  data: T;
  msg: string;
}

const request = createRequest<BackendResponse>(
  { baseURL: 'https://api.example.com' },
  {
    isBackendSuccess: (response) => response.data.code === 200,
    transform: (response) => response.data.data,
    onRequest: async (config) => {
      config.headers.set('Authorization', `Bearer ${getToken()}`);
      return config;
    },
    onError: (error) => console.error(error.message),
  }
);

const userInfo = await request<Api.UserInfo>({ url: '/api/user' });
```

### `createFlatRequest`

创建一个 **Result 风格**的请求实例，永远不抛异常。

```ts
function createFlatRequest<ResponseData, ApiData, State>(
  axiosConfig?: CreateAxiosDefaults,
  options?: Partial<RequestOption<ResponseData, ApiData, State>>
): FlatRequestInstance<ResponseData, ApiData, State>
```

**返回值：**

```ts
// 成功
{ data: ApiData; error: null; response: AxiosResponse }
// 失败
{ data: null; error: AxiosError; response: AxiosResponse }
```

**示例：**

```ts
const flatRequest = createFlatRequest<BackendResponse, BackendResponse['data']>(
  { baseURL: 'https://api.example.com' },
  {
    isBackendSuccess: (response) => response.data.code === 200,
    transform: (response) => response.data.data,
  }
);

const { data, error } = await flatRequest({ url: '/api/users' });
if (error) {
  console.error(error.message);
  return;
}
console.log(data);
```

## 配置项

### Axios 默认配置

通过第一个参数传入，会与以下默认值合并：

| 配置 | 默认值 |
|------|--------|
| `headers.Content-Type` | `application/json` |
| `timeout` | `10000`（10 秒） |
| `paramsSerializer` | `qs.stringify` |
| `validateStatus` | `200-299` 或 `304` |

axios-retry 的配置也通过此对象传入，默认 `retries: 0`（不重试）。

### RequestOption 钩子

| 钩子 | 说明 |
|------|------|
| `isBackendSuccess` | HTTP 成功后判断业务是否成功（仅 JSON） |
| `transform` | 将原始响应转换为业务数据（仅 JSON 且业务成功） |
| `onRequest` | 请求前修改配置（注入 Token 等） |
| `onBackendFail` | 业务失败处理，可返回新响应实现重试 |
| `onError` | 所有错误的统一回调 |
| `defaultState` | 仅 `createFlatRequest`：初始化实例 state |

## 错误处理

| 场景 | `createRequest` | `createFlatRequest` |
|------|----------------|---------------------|
| HTTP 错误 (4xx/5xx) | `onError` → 抛出异常 | `{ data: null, error }` |
| 业务错误 | `onBackendFail` → `onError` → 抛出异常 | `{ data: null, error }` |
| 请求取消 | `onError`（`ERR_CANCELED`）→ 抛出 | `{ data: null, error }` |

通过 `BACKEND_ERROR_CODE` 区分业务错误与 HTTP 错误：

```ts
import { BACKEND_ERROR_CODE } from '@skyroc/axios';

if (error.code === BACKEND_ERROR_CODE) {
  // 业务错误：HTTP 成功但 code 不正确
} else {
  // HTTP 错误或网络错误
}
```

## Token 刷新重试

通过 `onBackendFail` 实现：

```ts
createRequest<BackendResponse>(axiosConfig, {
  async onBackendFail(response, instance) {
    if (String(response.data.code) === '401') {
      const success = await refreshToken();
      if (success) {
        response.config.headers.Authorization = `Bearer ${getNewToken()}`;
        return instance.request(response.config);
      }
    }
    return null;
  },
});
```

## 请求取消

```ts
// cancelAllRequest 取消所有由包管理的请求
request.cancelAllRequest();

// 自定义 signal 的请求不受 cancelAllRequest 影响
const controller = new AbortController();
request({ url: '/api/data', signal: controller.signal });
request.cancelAllRequest(); // 不会取消上面的请求
controller.abort();         // 手动取消
```

## 响应类型

TypeScript 自动推导返回值类型：

```ts
const data = await request<Api.User>({ url: '/user' });            // → Api.User
const blob = await request({ url: '/file', responseType: 'blob' }); // → Blob
const text = await request({ url: '/text', responseType: 'text' }); // → string
```

非 JSON 响应不经过 `transform`，直接返回 `response.data`。

## 实例状态

请求实例的 `state` 属性用于在请求生命周期中共享状态：

```ts
const request = createFlatRequest<BackendResponse, any, { token: string }>(
  axiosConfig,
  { defaultState: { token: '' } }
);

request.state.token = 'new-token';
```

## 常量与类型导出

**常量：**

| 常量 | 值 | 说明 |
|------|-----|------|
| `BACKEND_ERROR_CODE` | `'BACKEND_ERROR'` | 业务失败的 AxiosError code |
| `REQUEST_ID_KEY` | `'X-Request-Id'` | 请求 ID header key |

**类型：**

| 类型 | 说明 |
|------|------|
| `RequestOption` | 请求选项 |
| `RequestInstance` | `createRequest` 返回类型 |
| `FlatRequestInstance` | `createFlatRequest` 返回类型 |
| `FlatResponseData` | Flat 请求的联合返回类型 |
| `CustomAxiosRequestConfig` | 请求配置（支持 responseType 推导） |
| `MappedType` | 响应类型映射 |
| `ResponseType` | 响应类型字面量 |
| `ContentType` | Content-Type 字面量 |

## 相关包

在实际项目中，通常不直接使用 `@skyroc/axios`，而是通过 `@skyroc/service` 进行上层封装。它基于本包提供了**平台适配器模式**、**业务状态码管理**、**Token 自动刷新**、**错误消息去重**等开箱即用的能力。

## License

MIT
