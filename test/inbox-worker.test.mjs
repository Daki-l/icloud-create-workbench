import test from "node:test";
import assert from "node:assert/strict";
import { createInboxSyncWorker } from "../src/services/inbox-sync-worker.mjs";

test("后台 IMAP 调度中单个 CK 失败不会阻止其他 CK", async () => {
  const called = [];
  const repositories = { listInboxConfigs: () => [
    { account_id: "one", next_sync_at: null },
    { account_id: "two", next_sync_at: null },
    { account_id: "three", next_sync_at: null }
  ] };
  const inboxService = {
    /** 模拟一个失败账号和两个成功账号。 */
    async sync(accountId) {
      called.push(accountId);
      if (accountId === "two") throw new Error("IMAP 失败");
    }
  };
  const worker = createInboxSyncWorker({ config: { inboxSyncConcurrency: 2, inboxSyncIntervalSeconds: 30 }, repositories, inboxService });
  await worker.tick();
  assert.deepEqual(called.sort(), ["one", "three", "two"]);
  worker.close();
});
