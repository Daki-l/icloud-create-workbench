/** 发起同源 API 请求并统一处理登录过期和错误响应。 */
export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (response.status === 401) {
    if (!location.pathname.endsWith("login.html")) location.href = "/login.html";
    throw new Error("登录已过期");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `请求失败：${response.status}`);
    error.cooldownUntil = data.cooldownUntil;
    throw error;
  }
  return data;
}

/** 将表单值转换为普通对象。 */
export function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}
