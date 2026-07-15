import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../src/db.mjs";
import { createRepositories } from "../src/repositories.mjs";

/** 创建用于库存分页与独立 IMAP 配置测试的临时数据库。 */
function createContext() {
  const directory = mkdtempSync(join(tmpdir(), "icloud-inventory-"));
  const db = createDatabase(join(directory, "test.db"));
  const repositories = createRepositories(db);
  /** 创建一个测试 CK 账号。 */
  function addAccount(key) {
    return repositories.upsertAccount({ identityKey: key, appleId: `${key}@example.com`, dsid: key,
      displayName: key, region: "global", userPartition: "68", maildomainHost: "p68-maildomainws.icloud.com", cookieEncrypted: "encrypted" });
  }
  /** 清理临时数据库。 */
  function cleanup() { db.close(); rmSync(directory, { recursive: true, force: true }); }
  return { repositories, addAccount, cleanup };
}

test("邮箱库存支持分页和批量状态修改", () => {
  const context = createContext();
  try {
    const account = context.addAccount("one");
    const rows = Array.from({ length: 25 }, (_, index) => ({ email: `page-${index}@icloud.com`, label: `page-${index}` }));
    context.repositories.upsertAddresses(account.id, null, rows, "synced");
    const first = context.repositories.pageAddresses({ accountId: account.id }, 1, 20);
    const second = context.repositories.pageAddresses({ accountId: account.id }, 2, 20);
    assert.equal(first.rows.length, 20); assert.equal(second.rows.length, 5); assert.equal(first.total, 25);
    const ids = first.rows.slice(0, 3).map(item => item.id);
    assert.equal(context.repositories.updateAddressStates(ids, "used"), 3);
    assert.equal(context.repositories.pageAddresses({ accountId: account.id, state: "used" }, 1, 20).total, 3);
  } finally { context.cleanup(); }
});

test("每条 CK 保存各自独立的 IMAP 配置", () => {
  const context = createContext();
  try {
    const first = context.addAccount("first"); const second = context.addAccount("second");
    context.repositories.saveInboxConfig(first.id, { host: "imap.first.test", port: 993, secure: true, email: "first@test", passwordEncrypted: "one", mailbox: "INBOX" });
    context.repositories.saveInboxConfig(second.id, { host: "imap.second.test", port: 993, secure: true, email: "second@test", passwordEncrypted: "two", mailbox: "Codes" });
    assert.equal(context.repositories.getInboxConfigInternal(first.id).host, "imap.first.test");
    assert.equal(context.repositories.getInboxConfigInternal(first.id).html_backfill_done, 1);
    assert.equal(context.repositories.getInboxConfigInternal(second.id).host, "imap.second.test");
    assert.notEqual(context.repositories.getInboxConfigInternal(first.id).password_encrypted, context.repositories.getInboxConfigInternal(second.id).password_encrypted);
  } finally { context.cleanup(); }
});
