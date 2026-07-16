export const STORAGE_KEY = 'icloudCkRecord';

export const REGION_CONFIG = {
  global: {
    label: '国际区',
    origin: 'https://www.icloud.com',
    validateUrl: 'https://setup.icloud.com/setup/ws/1/validate'
  },
  china: {
    label: '中国区',
    origin: 'https://www.icloud.com.cn',
    validateUrl: 'https://setup.icloud.com.cn/setup/ws/1/validate'
  }
};

/** 根据页面或请求地址判断 iCloud 区域。 */
export function detectRegion(url = '') {
  return String(url).includes('.icloud.com.cn') ? 'china' : 'global';
}

/** 将浏览器 Cookie 列表转换为可直接导入控制台的 CK 字符串。 */
export function formatCookieHeader(cookies = []) {
  return cookies
    .filter(cookie => cookie && cookie.name && typeof cookie.value === 'string')
    .sort((left, right) => String(right.path || '').length - String(left.path || '').length)
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

/** 从隐藏邮箱接口请求中提取准确的 Cookie 请求头。 */
export function extractCapturedRecord(details) {
  let url;
  try {
    url = new URL(details?.url || '');
  } catch {
    return null;
  }

  const isMaildomainHost = /^p\d+-maildomainws\.icloud\.com(?:\.cn)?$/i.test(url.hostname);
  const isHideMyEmailRequest = /^\/v[12]\/hme(?:\/|$)/i.test(url.pathname);
  if (!isMaildomainHost || !isHideMyEmailRequest) return null;

  const cookieHeader = details.requestHeaders?.find(header => header.name.toLowerCase() === 'cookie');
  const cookie = String(cookieHeader?.value || '').trim();
  if (!cookie || !cookie.includes('X-APPLE')) return null;

  return {
    cookie,
    region: detectRegion(details.url),
    source: 'request',
    requestUrl: details.url,
    maildomainHost: url.hostname,
    capturedAt: new Date().toISOString()
  };
}
