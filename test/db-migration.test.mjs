import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createDatabase } from "../src/db.mjs";

test("旧版 IMAP 配置表可先补字段再创建同步索引", () => {
  const directory = mkdtempSync(join(tmpdir(), "workbench-migration-"));
  const databasePath = join(directory, "legacy.db");
  const legacy = new Database(databasePath);
  legacy.exec(`CREATE TABLE icloud_accounts (
    id TEXT PRIMARY KEY,
    apple_id_masked TEXT NOT NULL
  );
  INSERT INTO icloud_accounts (id, apple_id_masked) VALUES ('legacy-account', 'owner@example.com');
  CREATE TABLE account_inbox_configs (
    account_id TEXT PRIMARY KEY,
    host TEXT,
    port INTEGER,
    secure INTEGER,
    email TEXT,
    password_encrypted TEXT,
    mailbox TEXT,
    updated_at TEXT
  )`);
  legacy.prepare("INSERT INTO account_inbox_configs (account_id) VALUES (?)").run("legacy-account");
  legacy.close();

  const migrated = createDatabase(databasePath);
  const accountColumns = migrated.pragma("table_info(icloud_accounts)").map(column => column.name);
  const columns = migrated.pragma("table_info(account_inbox_configs)").map(column => column.name);
  const messageColumns = migrated.pragma("table_info(inbox_messages)").map(column => column.name);
  const indexes = migrated.pragma("index_list(account_inbox_configs)").map(index => index.name);
  assert.ok(accountColumns.includes("apple_id"));
  assert.ok(!accountColumns.includes("apple_id_masked"));
  assert.equal(migrated.prepare("SELECT apple_id FROM icloud_accounts WHERE id = ?").get("legacy-account").apple_id,
    "owner@example.com");
  assert.ok(columns.includes("next_sync_at"));
  assert.equal(migrated.prepare("SELECT html_backfill_done FROM account_inbox_configs WHERE account_id = ?")
    .get("legacy-account").html_backfill_done, 0);
  assert.ok(messageColumns.includes("body_html"));
  assert.ok(indexes.includes("idx_inbox_configs_due"));
  migrated.close();
  rmSync(directory, { recursive: true, force: true });
});

test("启动迁移清理重复任务后创建唯一索引", () => {
  const directory = mkdtempSync(join(tmpdir(), "workbench-task-migration-"));
  const databasePath = join(directory, "tasks.db");
  const initial = createDatabase(databasePath);
  initial.exec("DROP INDEX idx_campaigns_one_open_per_account; DROP INDEX idx_jobs_one_active_per_account");
  const now = new Date().toISOString();
  initial.prepare(`INSERT INTO icloud_accounts
    (id, apple_id, identity_key, region, cookie_encrypted, created_at, updated_at)
    VALUES ('account-1', 'owner@example.com', 'identity-1', 'global', 'encrypted', ?, ?)`).run(now, now);
  const insertCampaign = initial.prepare(`INSERT INTO generation_campaigns
    (id, account_id, target_total, batch_size, label_prefix, status, created_at, updated_at)
    VALUES (?, 'account-1', 10, 5, 'test', ?, ?, ?)`);
  insertCampaign.run("campaign-old", "stopped", "2026-01-01T00:00:00.000Z", now);
  insertCampaign.run("campaign-new", "running", "2026-01-02T00:00:00.000Z", now);
  const insertJob = initial.prepare(`INSERT INTO generation_jobs
    (id, account_id, requested_count, status, created_at) VALUES (?, 'account-1', 5, ?, ?)`);
  insertJob.run("job-old", "running", "2026-01-01T00:00:00.000Z");
  insertJob.run("job-new", "queued", "2026-01-02T00:00:00.000Z");
  initial.close();

  const migrated = createDatabase(databasePath);
  assert.equal(migrated.prepare("SELECT status FROM generation_campaigns WHERE id = 'campaign-old'").get().status, "superseded");
  assert.equal(migrated.prepare("SELECT status FROM generation_campaigns WHERE id = 'campaign-new'").get().status, "running");
  const oldJob = migrated.prepare("SELECT status, error_summary FROM generation_jobs WHERE id = 'job-old'").get();
  assert.equal(oldJob.status, "failed");
  assert.equal(oldJob.error_summary, "重复任务已由系统终止");
  assert.throws(() => insertDuplicateCampaign(migrated, now), /UNIQUE constraint failed/);
  migrated.close();
  rmSync(directory, { recursive: true, force: true });
});

/** 尝试插入重复活动生产目标，验证迁移后的数据库约束。 */
function insertDuplicateCampaign(db, now) {
  db.prepare(`INSERT INTO generation_campaigns
    (id, account_id, target_total, batch_size, label_prefix, status, created_at, updated_at)
    VALUES ('campaign-duplicate', 'account-1', 20, 5, 'test', 'running', ?, ?)`).run(now, now);
}
