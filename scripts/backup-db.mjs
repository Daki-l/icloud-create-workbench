import "dotenv/config";
import Database from "better-sqlite3";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/** 使用 SQLite 在线备份 API 创建一致性备份。 */
async function main() {
  const source = resolve(process.env.DATABASE_PATH || "./data/workbench.db");
  const suffix = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const destination = resolve(process.argv[2] || `./backups/workbench-${suffix}.db`);
  await mkdir(dirname(destination), { recursive: true });
  const db = new Database(source, { readonly: true });
  try {
    await db.backup(destination);
    console.log(`数据库已备份到 ${destination}`);
  } finally {
    db.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
