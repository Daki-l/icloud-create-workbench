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
  legacy.exec(`CREATE TABLE account_inbox_configs (
    account_id TEXT PRIMARY KEY,
    host TEXT,
    port INTEGER,
    secure INTEGER,
    email TEXT,
    password_encrypted TEXT,
    mailbox TEXT,
    updated_at TEXT
  )`);
  legacy.close();

  const migrated = createDatabase(databasePath);
  const columns = migrated.pragma("table_info(account_inbox_configs)").map(column => column.name);
  const indexes = migrated.pragma("index_list(account_inbox_configs)").map(index => index.name);
  assert.ok(columns.includes("next_sync_at"));
  assert.ok(indexes.includes("idx_inbox_configs_due"));
  migrated.close();
  rmSync(directory, { recursive: true, force: true });
});
