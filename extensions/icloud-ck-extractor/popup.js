import { detectRegion, formatCookieHeader, REGION_CONFIG, STORAGE_KEY } from './cookie-utils.js';

const openButton = document.querySelector('#openButton');
const extractButton = document.querySelector('#extractButton');
const copyButton = document.querySelector('#copyButton');
const clearButton = document.querySelector('#clearButton');
const cookieOutput = document.querySelector('#cookieOutput');
const metaText = document.querySelector('#metaText');
const statusText = document.querySelector('#statusText');

let currentRecord = null;

/** 更新插件弹窗中的 CK、来源和操作状态。 */
function renderRecord(record, message = '') {
  currentRecord = record || null;
  cookieOutput.value = currentRecord?.cookie || '';
  copyButton.disabled = !currentRecord?.cookie;
  clearButton.disabled = !currentRecord?.cookie;

  if (!currentRecord) {
    metaText.textContent = '尚未提取';
    setStatus(message || '等待提取');
    return;
  }

  const regionLabel = REGION_CONFIG[currentRecord.region]?.label || '未知区域';
  const sourceLabel = currentRecord.source === 'request' ? '接口捕获' : 'Cookie 读取';
  const capturedAt = new Date(currentRecord.capturedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  metaText.textContent = `${regionLabel} · ${sourceLabel} · ${capturedAt}`;
  setStatus(message || 'CK 已就绪', 'success');
}

/** 显示当前操作结果。 */
function setStatus(message, type = '') {
  statusText.textContent = message;
  statusText.className = `status ${type}`.trim();
}

/** 获取当前标签页，无法读取时返回空对象。 */
async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || {};
}

/** 从浏览器将要发送给 iCloud 校验接口的 Cookie 中生成 CK。 */
async function extractCurrentCookie() {
  extractButton.disabled = true;
  setStatus('正在读取 iCloud CK…');
  try {
    const tab = await getCurrentTab();
    const region = detectRegion(tab.url);
    const config = REGION_CONFIG[region];
    const cookies = await chrome.cookies.getAll({ url: config.validateUrl });
    const cookie = formatCookieHeader(cookies);
    if (!cookie.includes('X-APPLE')) {
      throw new Error(`未找到 ${config.label} 的有效登录 CK，请先登录 iCloud`);
    }

    const record = {
      cookie,
      region,
      source: 'cookies',
      requestUrl: config.validateUrl,
      maildomainHost: '',
      capturedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({ [STORAGE_KEY]: record });
    renderRecord(record, '已从浏览器读取 CK');
  } catch (error) {
    setStatus(error.message || '读取 CK 失败', 'error');
  } finally {
    extractButton.disabled = false;
  }
}

/** 打开与当前区域对应的 iCloud+ 页面。 */
async function openIcloudPlus() {
  const tab = await getCurrentTab();
  const region = detectRegion(tab.url);
  await chrome.tabs.create({ url: `${REGION_CONFIG[region].origin}/icloudplus/` });
}

/** 将当前 CK 写入系统剪贴板。 */
async function copyCurrentCookie() {
  if (!currentRecord?.cookie) return;
  try {
    await navigator.clipboard.writeText(currentRecord.cookie);
    setStatus('CK 已复制，可直接粘贴到控制台', 'success');
  } catch {
    cookieOutput.select();
    document.execCommand('copy');
    setStatus('CK 已复制，可直接粘贴到控制台', 'success');
  }
}

/** 清除插件本地保存的 CK。 */
async function clearCurrentCookie() {
  await chrome.storage.local.remove(STORAGE_KEY);
  renderRecord(null, '本地 CK 已清除');
}

/** 初始化弹窗并读取后台最近捕获的 CK。 */
async function initialize() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  renderRecord(result[STORAGE_KEY] || null);
}

openButton.addEventListener('click', openIcloudPlus);
extractButton.addEventListener('click', extractCurrentCookie);
copyButton.addEventListener('click', copyCurrentCookie);
clearButton.addEventListener('click', clearCurrentCookie);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    renderRecord(changes[STORAGE_KEY].newValue || null, '已自动捕获隐藏邮箱接口 CK');
  }
});

initialize();
