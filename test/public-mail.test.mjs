import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../src/db.mjs";
import { createRepositories } from "../src/repositories.mjs";
import { createPublicMailService } from "../src/services/public-mail-service.mjs";
import { createApp } from "../src/app.mjs";
import { hashPassword } from "../src/security.mjs";

/** 创建包含一个隐私邮箱的公开邮件测试环境。 */
function createContext() {
  const directory = mkdtempSync(join(tmpdir(), "icloud-public-mail-"));
  const db = createDatabase(join(directory, "test.db"));
  const repositories = createRepositories(db);
  const account = repositories.upsertAccount({ identityKey: "public", appleIdMasked: "pu***@example.com",
    dsid: "public", displayName: "公开测试", region: "global", userPartition: "68",
    maildomainHost: "p68-maildomainws.icloud.com", cookieEncrypted: "encrypted" });
  repositories.upsertAddresses(account.id, null, [{ email: "public@icloud.com", label: "public-001" }], "generated");
  const address = repositories.listAddresses({ accountId: account.id })[0];
  const config = {
    appOrigin: "http://127.0.0.1:4173", adminUsername: "admin", adminPasswordHash: hashPassword("password-12345"),
    jwtSecret: "public-mail-test-secret-value-123456789", jwtExpiresIn: "8h", cookieSecure: false,
    publicMailRateLimit: 60
  };
  const publicMailService = createPublicMailService({ config, repositories });
  const app = createApp({ config, repositories, publicMailService,
    icloudService: {}, inboxService: { getConfig: () => ({ configured: false }) },
    campaignService: { listCampaigns: () => [] } });
  /** 清理测试数据库。 */
  function cleanup() { db.close(); rmSync(directory, { recursive: true, force: true }); }
  return { app, address, repositories, publicMailService, cleanup };
}

test("公开链接在无邮件时返回 message null，并带跨域与禁用缓存头", async () => {
  const context = createContext();
  try {
    const access = context.publicMailService.createAccess(context.address.id);
    const path = new URL(access.apiUrl).pathname;
    const response = await request(context.app).get(path).expect(200);
    assert.equal(response.body.email, "public@icloud.com");
    assert.equal(response.body.message, null);
    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.match(response.headers["cache-control"], /no-store/);
  } finally { context.cleanup(); }
});

test("公开接口返回最新纯文本邮件，错误或撤销密钥统一返回 404", async () => {
  const context = createContext();
  try {
    const access = context.publicMailService.createAccess(context.address.id);
    context.repositories.insertMessage(context.address.accountId, { uid: "public:1", recipient: context.address.email,
      subject: "验证码", sender: "sender@example.com", code: "654321", preview: "最新邮件",
      bodyText: "您的验证码是 654321", bodyHtml: "<strong>您的验证码是 654321</strong>",
      receivedAt: new Date().toISOString() });
    const path = new URL(access.apiUrl).pathname;
    const response = await request(context.app).get(path).expect(200);
    assert.equal(response.body.message.code, "654321");
    assert.equal(response.body.message.bodyText, "您的验证码是 654321");
    assert.equal(response.body.message.bodyHtml, undefined);
    const stored = context.repositories.getMessage(response.body.message.id);
    assert.equal(stored.bodyHtml, "<strong>您的验证码是 654321</strong>");
    await request(context.app).get(path.replace(access.token, "wrong-token-value-that-is-long-enough-123456")).expect(404);
    context.publicMailService.revokeAccess(context.address.id);
    await request(context.app).get(path).expect(404);
  } finally { context.cleanup(); }
});
