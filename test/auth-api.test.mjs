import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.mjs";

/** 创建无需真实数据库和 Apple 调用的 API 测试应用。 */
function createTestApp() {
  const config = {
    appOrigin: "http://127.0.0.1:4173",
    adminUsername: "admin",
    adminPassword: "correct-password",
    jwtSecret: "test-jwt-secret-that-is-long-enough-123456789",
    jwtExpiresIn: "8h",
    cookieSecure: false,
    publicMailRateLimit: 60
  };
  const repositories = {
    listAccounts: () => [],
    listAllJobs: () => [],
    pageAllJobs: () => ({ rows: [], total: 0 }),
    listAddresses: () => [],
    listMessages: () => [],
    getInboxConfigInternal: () => null,
    getSetting: () => null,
    setSetting: () => {}
  };
  const icloudService = {};
  const inboxService = { getConfig: () => ({ configured: false }) };
  const campaignService = { listCampaigns: () => [] };
  const publicMailService = { getLatest: () => null };
  const inboxSyncWorker = { resolveInterval: () => 30, updateInterval: () => {} };
  return createApp({ config, repositories, icloudService, inboxService, campaignService, publicMailService, inboxSyncWorker });
}

test("健康检查无需登录且不返回配置", async () => {
  const response = await request(createTestApp()).get("/api/health").expect(200);
  assert.deepEqual(response.body, { ok: true, service: "icloud-create-workbench" });
  assert.match(response.headers["content-security-policy"], /api\.iconify\.design/);
});

test("浏览器标签图标和系统 Logo 可以由本地静态资源访问", async () => {
  await request(createTestApp()).get("/favicon.ico").expect(200).expect("Content-Type", /image/);
  await request(createTestApp()).get("/assets/icloud-logo.png").expect(200).expect("Content-Type", /image\/png/);
});

test("未登录时受保护 API 返回 401", async () => {
  await request(createTestApp()).get("/api/icloud-accounts").expect(401);
});

test("管理页面要求登录但登录页和公开邮件页可匿名访问", async () => {
  const app = createTestApp();
  // 根路径不暴露登录入口，未登录返回静默 404。
  await request(app).get("/index.html").expect(404);
  const loginPage = await request(app).get("/login").expect(200).expect("Content-Type", /html/);
  assert.match(loginPage.headers["cache-control"], /no-store/);
  assert.match(loginPage.headers["cache-control"], /no-transform/);
  await request(app).get("/mail/example%40icloud.com/public-token").expect(200).expect("Content-Type", /html/);
});

test("未登录访问根路径返回静默 404，不暴露登录页", async () => {
  const app = createTestApp();
  await request(app).get("/").expect(404);
  await request(app).get("/index.html").expect(404);
  // admin 路由仍强制登录，跳转到 /login。
  await request(app).get("/home").expect(302).expect("Location", "/login");
});

test("可信来源登录后可以访问受保护 API", async () => {
  const agent = request.agent(createTestApp());
  const login = await agent.post("/api/auth/login")
    .set("Origin", "http://127.0.0.1:4173")
    .send({ username: "admin", password: "correct-password" })
    .expect(200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  await agent.get("/api/icloud-accounts").expect(200, { accounts: [] });
  await agent.get("/api/generation-jobs").expect(200, {
    jobs: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 }
  });
});

test("错误来源的修改请求被拒绝", async () => {
  await request(createTestApp()).post("/api/auth/login")
    .set("Origin", "http://evil.example")
    .send({ username: "admin", password: "correct-password" })
    .expect(403);
});
