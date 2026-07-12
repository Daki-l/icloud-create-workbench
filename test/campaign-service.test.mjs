import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../src/db.mjs";
import { createRepositories } from "../src/repositories.mjs";
import { createCampaignService } from "../src/services/campaign-service.mjs";

/** 创建带真实 SQLite 和模拟生成器的生产目标测试环境。 */
function createContext() {
  const directory = mkdtempSync(join(tmpdir(), "icloud-campaign-"));
  const db = createDatabase(join(directory, "test.db"));
  const repositories = createRepositories(db);
  const account = repositories.upsertAccount({
    identityKey: "campaign-account", appleIdMasked: "te***@example.com", dsid: "1", displayName: "测试",
    region: "global", userPartition: "68", maildomainHost: "p68-maildomainws.icloud.com", cookieEncrypted: "encrypted"
  });
  let sequence = 0;
  const icloudService = {
    /** 模拟每批生成并写入隐藏邮箱，同时设置六十分钟冷却。 */
    async generate(accountId, count, prefix) {
      const generated = Array.from({ length: count }, () => {
        sequence++;
        return { email: `campaign-${sequence}@icloud.com`, label: `${prefix}-${sequence}`, createdAt: new Date().toISOString() };
      });
      repositories.upsertAddresses(accountId, null, generated, "generated");
      db.prepare("UPDATE icloud_accounts SET cooldown_until = ? WHERE id = ?")
        .run(new Date(Date.now() + 60 * 60_000).toISOString(), accountId);
      return { generated, errors: [] };
    }
  };
  const service = createCampaignService({
    config: { targetDefault: 700, batchLimit: 5, cooldownMinutes: 60, retryMinutes: 5 }, repositories, icloudService
  });
  /** 清理测试数据库和临时目录。 */
  function cleanup() { service.close(); db.close(); rmSync(directory, { recursive: true, force: true }); }
  return { account, repositories, service, cleanup };
}

test("生产目标默认库存为 700 并立即执行首批五个", async () => {
  const context = createContext();
  try {
    const campaign = context.service.createCampaign({ accountId: context.account.id, labelPrefix: "changsheng" });
    assert.equal(campaign.targetTotal, 700);
    await context.service.wake();
    const stored = context.service.listCampaigns(10)[0];
    assert.equal(stored.currentTotal, 5);
    assert.equal(stored.generatedCount, 5);
    assert.equal(stored.status, "running");
    assert.ok(stored.nextRunAt);
  } finally { context.cleanup(); }
});

test("生产目标支持停止和继续", () => {
  const context = createContext();
  try {
    const campaign = context.service.createCampaign({ accountId: context.account.id, targetTotal: 10 });
    context.service.stopCampaign(campaign.id);
    assert.equal(context.service.listCampaigns(10)[0].status, "stopped");
    context.service.resumeCampaign(campaign.id);
    assert.equal(context.service.listCampaigns(10)[0].status, "running");
  } finally { context.cleanup(); }
});

test("生产目标可修改后续批次标签前缀并同步 CK 默认值", () => {
  const context = createContext();
  try {
    const campaign = context.service.createCampaign({ accountId: context.account.id, targetTotal: 10, labelPrefix: "old-prefix" });
    const result = context.service.updateLabelPrefix(campaign.id, { labelPrefix: "new_prefix" });
    assert.equal(result.labelPrefix, "new_prefix");
    assert.equal(context.service.listCampaigns(10)[0].labelPrefix, "new_prefix");
    assert.equal(context.repositories.getAccountInternal(context.account.id).label_prefix, "new_prefix");
  } finally { context.cleanup(); }
});
