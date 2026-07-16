import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectRegion,
  extractCapturedRecord,
  formatCookieHeader
} from '../extensions/icloud-ck-extractor/cookie-utils.js';

test('识别国际区和中国区 iCloud 地址', () => {
  assert.equal(detectRegion('https://www.icloud.com/icloudplus/'), 'global');
  assert.equal(detectRegion('https://www.icloud.com.cn/icloudplus/'), 'china');
});

test('将浏览器 Cookie 转换为 CK 字符串', () => {
  const result = formatCookieHeader([
    { name: 'ROOT', value: 'one', path: '/' },
    { name: 'X-APPLE-WEBAUTH-HSA-TRUST', value: 'two', path: '/setup' }
  ]);

  assert.equal(result, 'X-APPLE-WEBAUTH-HSA-TRUST=two; ROOT=one');
});

test('仅捕获隐藏邮箱接口中的有效 CK', () => {
  const record = extractCapturedRecord({
    url: 'https://p68-maildomainws.icloud.com/v2/hme/list?clientId=test',
    requestHeaders: [
      { name: 'Accept', value: '*/*' },
      { name: 'Cookie', value: 'X-APPLE-SECRET=value; other=yes' }
    ]
  });

  assert.equal(record.region, 'global');
  assert.equal(record.maildomainHost, 'p68-maildomainws.icloud.com');
  assert.equal(record.cookie, 'X-APPLE-SECRET=value; other=yes');
  assert.equal(
    extractCapturedRecord({
      url: 'https://feedbackws.icloud.com/reportStats',
      requestHeaders: [{ name: 'Cookie', value: 'X-APPLE-SECRET=value' }]
    }),
    null
  );
});
