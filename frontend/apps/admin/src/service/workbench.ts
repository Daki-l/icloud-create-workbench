/** 开发环境通过 Skyroc 代理访问 Node.js，生产环境保持同源。 */
function apiPath(path: string) {
  return `${import.meta.env.DEV ? '/proxy-default' : ''}${path}`;
}

/** 统一发送带 Cookie 的工作台请求。 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(apiPath(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  if (!response.ok) throw new Error(data.error || `请求失败：${response.status}`);
  return data as T;
}

/** 将查询参数转换为 URL 查询字符串。 */
export function queryString(values: Record<string, number | string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}
