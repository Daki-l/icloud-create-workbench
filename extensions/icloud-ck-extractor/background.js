import { extractCapturedRecord, STORAGE_KEY } from './cookie-utils.js';

/** 监听隐藏邮箱接口请求，并仅在本机保存其 CK。 */
function captureHideMyEmailRequest(details) {
  const record = extractCapturedRecord(details);
  if (record) chrome.storage.local.set({ [STORAGE_KEY]: record });
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  captureHideMyEmailRequest,
  {
    urls: [
      'https://*.icloud.com/*',
      'https://*.icloud.com.cn/*'
    ]
  },
  ['requestHeaders', 'extraHeaders']
);
