import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { createDatabase } from "../src/db.mjs";
import { createRepositories } from "../src/repositories.mjs";
import { createIcloudService } from "../src/services/icloud-service.mjs";

/** 创建使用临时 SQLite 和模拟 Python 桥接的测试上下文。 */
function createContext() {
  const directory = mkdtempSync(join(tmpdir(), "icloud-workbench-"));
  const db = createDatabase(join(directory, "test.db"));
  const repositories = createRepositories(db);
  const config = {
    encryptionKey: randomBytes(32).toString("base64"),
    batchLimit: 5,
    cooldownMinutes: 60
  };
  const calls = [];
  /** 模拟上游 CK 校验、生成和列表接口。 */
  async function callBridge(ignoredConfig, command, payload) {
    calls.push({ command, payload });
    if (command === "validate") return {
      ok: true, cookie: "X-APPLE-SECRET=value", region: "global", appleId: "owner@example.com",
      dsid: "123456", displayName: "测试账号", featureAvailable: true,
      userPartition: "68", maildomainHost: "p68-maildomainws.icloud.com"
    };
    if (command === "generate") return {
      ok: true,
      generated: payload.labels.map((label, index) => ({ email: `hidden${index}@icloud.com`, label, createdAt: new Date().toISOString() })),
      errors: []
    };
    if (command === "list") return { ok: true, addresses: [], maildomainHost: "p68-maildomainws.icloud.com" };
    throw new Error("未知命令");
  }
  const service = createIcloudService({ config, repositories, callBridge });
  /** 关闭测试数据库并删除临时目录。 */
  function cleanup() { db.close(); rmSync(directory, { recursive: true, force: true }); }
  return { repositories, service, calls, cleanup };
}

test("导入 CK 后只暴露脱敏账号信息", async () => {
  const context = createContext();
  try {
    const stored = await context.service.importAccount("Cookie: X-APPLE-SECRET=value", "auto");
    const publicAccount = context.repositories.getAccount(stored.id);
    assert.equal(publicAccount.appleIdMasked, "ow***@example.com");
    assert.equal("cookieEncrypted" in publicAccount, false);
    assert.equal(context.calls[0].command, "validate");
  } finally { context.cleanup(); }
});

test("批量生成成功后写入邮箱并强制冷却", async () => {
  const context = createContext();
  try {
    const account = await context.service.importAccount("X-APPLE-SECRET=value", "auto");
    const result = await context.service.generate(account.id, 2, "changsheng");
    assert.equal(result.generated.length, 2);
    assert.equal(context.repositories.listAddresses({ accountId: account.id }).length, 2);
    await assert.rejects(() => context.service.generate(account.id, 1, "changsheng"), error => error.status === 409);
  } finally { context.cleanup(); }
});

test("生成数量超过五个时由后端拒绝", async () => {
  const context = createContext();
  try {
    const account = await context.service.importAccount("X-APPLE-SECRET=value", "auto");
    await assert.rejects(() => context.service.generate(account.id, 6, "changsheng"), error => error.status === 400);
  } finally { context.cleanup(); }
});

test("同步成功后持久化桥接层探测到的有效分片", async () => {
  const context = createContext();
  try {
    const account = await context.service.importAccount("X-APPLE-SECRET=value", "auto");
    context.repositories.updateMaildomainHost(account.id, "p213-maildomainws.icloud.com");
    await context.service.syncAddresses(account.id);
    assert.equal(context.repositories.getAccountInternal(account.id).maildomain_host, "p68-maildomainws.icloud.com");
  } finally { context.cleanup(); }
});
