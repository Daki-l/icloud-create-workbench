import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import readline from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";

/** 读取普通终端输入，并允许环境变量用于自动化初始化。 */
async function ask(terminal, question, fallback = "") {
  const answer = (await terminal.question(`${question}${fallback ? ` [${fallback}]` : ""}：`)).trim();
  return answer || fallback;
}

/** 生成随机 Base64 密钥。 */
function randomSecret(bytes = 48) {
  return randomBytes(bytes).toString("base64");
}

/** 在交互终端中隐藏管理员密码输入。 */
function askHidden(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("非交互环境请通过 SETUP_PASSWORD 临时环境变量提供管理员密码");
  }
  return new Promise((resolve, reject) => {
    const characters = [];
    stdout.write(`${question}：`);
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    /** 处理密码字符、退格、确认和终止按键。 */
    function onKeypress(character, key) {
      if (key?.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("初始化已取消"));
        return;
      }
      if (key?.name === "return") {
        cleanup();
        stdout.write("\n");
        resolve(characters.join(""));
        return;
      }
      if (key?.name === "backspace") {
        if (characters.length) { characters.pop(); stdout.write("\b \b"); }
        return;
      }
      if (character && !key?.ctrl && !key?.meta) {
        characters.push(character);
        stdout.write("*");
      }
    }
    /** 恢复终端输入模式并移除监听器。 */
    function cleanup() {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
    }
    stdin.on("keypress", onKeypress);
  });
}

/** 交互生成服务器部署所需的 .env。 */
async function main() {
  if (existsSync(".env") && !process.argv.includes("--force")) {
    throw new Error(".env 已存在；如需覆盖请添加 --force");
  }
  const terminal = readline.createInterface({ input: stdin, output: stdout });
  try {
    const origin = process.env.SETUP_ORIGIN || await ask(terminal, "访问地址", "http://127.0.0.1:4173");
    const username = process.env.SETUP_USERNAME || await ask(terminal, "管理员账号", "admin");
    terminal.close();
    const password = process.env.SETUP_PASSWORD || await askHidden("管理员密码");
    if (password.length < 10) throw new Error("管理员密码至少需要 10 位");
    const content = `NODE_ENV=production\nHOST=0.0.0.0\nPORT=4173\nAPP_ORIGIN=${origin.replace(/\/$/, "")}\n\nADMIN_USERNAME=${username}\nADMIN_PASSWORD=${JSON.stringify(password)}\nJWT_SECRET=${randomSecret()}\nJWT_EXPIRES_IN=8h\nCOOKIE_SECURE=false\n\nDATA_ENCRYPTION_KEY=${randomSecret(32)}\nDATABASE_PATH=/app/data/workbench.db\nGENERATION_BATCH_LIMIT=5\nGENERATION_COOLDOWN_MINUTES=60\nGENERATION_TARGET_DEFAULT=700\nGENERATION_RETRY_MINUTES=5\nINBOX_SYNC_INTERVAL_SECONDS=30\nINBOX_SYNC_CONCURRENCY=2\nPUBLIC_MAIL_RATE_LIMIT=60\nLOG_LEVEL=info\nPYTHON_COMMAND=python\nPYTHON_BRIDGE=./python/hme_bridge.py\n`;
    await writeFile(".env", content, { encoding: "utf8", mode: 0o600 });
    stdout.write(".env 已生成。请勿提交或分享该文件。\n");
  } finally {
    terminal.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
