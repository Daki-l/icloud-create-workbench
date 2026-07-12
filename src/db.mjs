import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

/** 创建数据库并执行启动迁移。 */
export function createDatabase(databasePath) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS icloud_accounts (
      id TEXT PRIMARY KEY,
      apple_id_masked TEXT NOT NULL,
      identity_key TEXT NOT NULL UNIQUE,
      dsid TEXT,
      display_name TEXT,
      region TEXT NOT NULL,
      user_partition TEXT,
      maildomain_host TEXT,
      cookie_encrypted TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      label_prefix TEXT NOT NULL DEFAULT 'changsheng',
      label_sequence INTEGER NOT NULL DEFAULT 0,
      cooldown_until TEXT,
      last_checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS generation_jobs (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      requested_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      error_summary TEXT,
      started_at TEXT,
      finished_at TEXT,
      first_success_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES icloud_accounts(id)
    );
    CREATE TABLE IF NOT EXISTS hidden_addresses (
      id TEXT PRIMARY KEY,
      account_id TEXT,
      job_id TEXT,
      email TEXT NOT NULL UNIQUE,
      apple_label TEXT,
      local_state TEXT NOT NULL DEFAULT 'unused',
      source TEXT NOT NULL,
      error_text TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES icloud_accounts(id),
      FOREIGN KEY(job_id) REFERENCES generation_jobs(id)
    );
    CREATE TABLE IF NOT EXISTS generation_results (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      label TEXT,
      email TEXT,
      status TEXT NOT NULL,
      error_text TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(job_id) REFERENCES generation_jobs(id)
    );
    CREATE TABLE IF NOT EXISTS generation_campaigns (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      target_total INTEGER NOT NULL DEFAULT 700,
      batch_size INTEGER NOT NULL DEFAULT 5,
      label_prefix TEXT NOT NULL DEFAULT 'changsheng',
      status TEXT NOT NULL,
      generated_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      next_run_at TEXT,
      last_run_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(account_id) REFERENCES icloud_accounts(id)
    );
    CREATE TABLE IF NOT EXISTS inbox_config (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      host TEXT,
      port INTEGER,
      secure INTEGER,
      email TEXT,
      password_encrypted TEXT,
      mailbox TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS account_inbox_configs (
      account_id TEXT PRIMARY KEY,
      host TEXT,
      port INTEGER,
      secure INTEGER,
      email TEXT,
      password_encrypted TEXT,
      mailbox TEXT,
      updated_at TEXT,
      FOREIGN KEY(account_id) REFERENCES icloud_accounts(id)
    );
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id TEXT PRIMARY KEY,
      address_id TEXT,
      message_uid TEXT NOT NULL UNIQUE,
      subject TEXT,
      sender TEXT,
      code TEXT,
      preview TEXT,
      body_text TEXT,
      received_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(address_id) REFERENCES hidden_addresses(id)
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_account ON generation_jobs(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_addresses_account ON hidden_addresses(account_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_results_job ON generation_results(job_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_campaigns_due ON generation_campaigns(status, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_messages_received ON inbox_messages(received_at DESC);
  `);
  const messageColumns = db.pragma("table_info(inbox_messages)");
  if (!messageColumns.some(column => column.name === "account_id")) {
    db.exec("ALTER TABLE inbox_messages ADD COLUMN account_id TEXT REFERENCES icloud_accounts(id)");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_messages_account ON inbox_messages(account_id, received_at DESC)");
  return db;
}
