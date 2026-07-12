import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { decryptSecret, encryptSecret } from "../security.mjs";

/** 从邮件文本中提取常见验证码。 */
export function extractCode(text) {
  const content = String(text || "");
  const patterns = [
    /(?:验证码|校验码|动态码|verification code|security code|OTP)[^0-9A-Z]{0,16}([0-9]{4,8})/i,
    /\b([0-9]{6})\b/,
    /\b([A-Z0-9]{6,8})\b/i
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return "";
}

/** 创建全局 IMAP 收件服务。 */
export function createInboxService({ config, repositories }) {
  /** 返回不包含密码的 IMAP 配置。 */
  function getConfig(accountId) {
    const stored = repositories.getInboxConfigInternal(accountId);
    if (!stored) return { configured: false };
    return {
      configured: Boolean(stored.host && stored.email && stored.password_encrypted),
      host: stored.host,
      port: stored.port,
      secure: Boolean(stored.secure),
      email: stored.email,
      mailbox: stored.mailbox,
      hasPassword: Boolean(stored.password_encrypted)
    };
  }

  /** 校验并保存 IMAP 配置，密码为空时保留旧密码。 */
  function saveConfig(accountId, input) {
    const account = repositories.getAccountInternal(accountId);
    if (!account || account.status === "deleted") throw Object.assign(new Error("CK 账号不存在"), { status: 404 });
    const existing = repositories.getInboxConfigInternal(accountId);
    const host = String(input.host || "").trim();
    const email = String(input.email || "").trim();
    const port = Number(input.port || 993);
    if (!host || !email || !Number.isInteger(port)) throw Object.assign(new Error("IMAP 主机、端口和邮箱不能为空"), { status: 400 });
    const passwordEncrypted = input.password
      ? encryptSecret(String(input.password), config.encryptionKey)
      : existing?.password_encrypted;
    if (!passwordEncrypted) throw Object.assign(new Error("首次配置必须填写 IMAP 密码或授权码"), { status: 400 });
    repositories.saveInboxConfig(accountId, {
      host,
      port,
      secure: input.secure !== false,
      email,
      passwordEncrypted,
      mailbox: String(input.mailbox || "INBOX").trim() || "INBOX"
    });
    return getConfig(accountId);
  }

  /** 在邮件原文中匹配已知隐藏邮箱地址。 */
  function matchHiddenAddress(accountId, text) {
    const lower = String(text || "").toLowerCase();
    return repositories.listAddresses({ accountId }).find(item => lower.includes(item.email.toLowerCase()))?.email || "";
  }

  /** 连接 IMAP 并同步最近邮件。 */
  async function sync(accountId) {
    const stored = repositories.getInboxConfigInternal(accountId);
    if (!stored?.password_encrypted) throw Object.assign(new Error("尚未配置 IMAP 收件邮箱"), { status: 400 });
    const client = new ImapFlow({
      host: stored.host,
      port: stored.port,
      secure: Boolean(stored.secure),
      auth: { user: stored.email, pass: decryptSecret(stored.password_encrypted, config.encryptionKey) },
      logger: false
    });
    let added = 0;
    await client.connect();
    try {
      const lock = await client.getMailboxLock(stored.mailbox || "INBOX");
      try {
        const total = Number(client.mailbox?.exists || 0);
        if (!total) return { added: 0, scanned: 0 };
        const start = Math.max(1, total - 99);
        for await (const message of client.fetch(`${start}:*`, { uid: true, source: true, envelope: true, internalDate: true })) {
          const parsed = await simpleParser(message.source);
          const bodyText = String(parsed.text || parsed.html || "").slice(0, 100_000);
          const searchable = `${parsed.headers?.get("delivered-to") || ""}\n${parsed.to?.text || ""}\n${bodyText}`;
          const inserted = repositories.insertMessage(accountId, {
            uid: `${accountId}:${stored.mailbox || "INBOX"}:${message.uid}`,
            subject: parsed.subject || "",
            sender: parsed.from?.text || "",
            recipient: matchHiddenAddress(accountId, searchable),
            code: extractCode(`${parsed.subject || ""}\n${bodyText}`),
            preview: bodyText.replace(/\s+/g, " ").slice(0, 240),
            bodyText,
            receivedAt: (parsed.date || message.internalDate || new Date()).toISOString()
          });
          if (inserted) added++;
        }
        return { added, scanned: Math.min(total, 100) };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  return { getConfig, saveConfig, sync };
}
