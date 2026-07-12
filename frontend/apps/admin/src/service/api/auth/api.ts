/** 返回开发环境代理前缀。 */
function apiPath(path: string) {
  return `${import.meta.env.DEV ? '/proxy-default' : ''}${path}`;
}

/** 解析认证接口错误。 */
async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data as T;
}

/** 使用管理员账号登录并由后端设置 HttpOnly Cookie。 */
export async function fetchLogin(params: Api.Auth.LoginParams) {
  const response = await fetch(apiPath('/api/auth/login'), {
    body: JSON.stringify({ password: params.password, username: params.userName }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  });
  await parseResponse<{ username: string }>(response);
  return { refreshToken: '', token: 'cookie-session' } satisfies Api.Auth.LoginResponse;
}

/** 读取当前管理员并转换为 Skyroc 用户信息。 */
export async function fetchGetUserInfo() {
  const response = await fetch(apiPath('/api/auth/me'), { credentials: 'include' });
  if (response.status === 401) return null;
  const data = await parseResponse<{ username: string }>(response);
  return { buttons: ['*'], roles: ['R_SUPER'], userId: 'admin', userName: data.username } satisfies Api.Auth.UserInfo;
}

/** Cookie 会话不使用刷新令牌，保留接口以兼容模板类型。 */
export async function fetchRefreshToken(_refreshToken: string) {
  return { refreshToken: '', token: 'cookie-session' } satisfies Api.Auth.LoginToken;
}
