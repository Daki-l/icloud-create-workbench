import { Router } from "express";
import { checkAdminPassword, hashPassword, resolveAdminUsername } from "../security.mjs";

/** 用户名格式：3-32 位字母、数字、下划线、连字符。 */
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

/** 创建管理员设置路由。 */
export function createSettingsRouter({ config, repositories, inboxSyncWorker }) {
  const router = Router();

  /** 返回非敏感的运行时配置，供设置页回显（不含密钥与密码）。 */
  router.get("/", (req, res) => {
    res.json({
      adminUsername: resolveAdminUsername(config, repositories),
      inboxSyncIntervalSeconds: inboxSyncWorker.resolveInterval()
    });
  });

  /** 校验当前密码并更新为新的管理员密码（以 scrypt 哈希存入数据库，覆盖环境变量）。 */
  router.post("/password", (req, res) => {
    const current = String(req.body?.currentPassword || "");
    const next = String(req.body?.newPassword || "");
    const overrideHash = repositories.getSetting("adminPasswordHash");
    if (!checkAdminPassword(current, { adminPassword: config.adminPassword, adminPasswordHash: config.adminPasswordHash, overrideHash })) {
      return res.status(401).json({ error: "当前密码错误" });
    }
    if (next.length < 10) return res.status(400).json({ error: "新密码至少 10 位" });
    if (next === current) return res.status(400).json({ error: "新密码不能与当前密码相同" });
    repositories.setSetting("adminPasswordHash", hashPassword(next));
    res.json({ ok: true });
  });

  /** 校验当前密码后修改管理员用户名（存入数据库覆盖环境变量，原会话立即失效）。 */
  router.post("/username", (req, res) => {
    const current = String(req.body?.currentPassword || "");
    const next = String(req.body?.newUsername || "").trim();
    const overrideHash = repositories.getSetting("adminPasswordHash");
    if (!checkAdminPassword(current, { adminPassword: config.adminPassword, adminPasswordHash: config.adminPasswordHash, overrideHash })) {
      return res.status(401).json({ error: "当前密码错误" });
    }
    if (!USERNAME_PATTERN.test(next)) return res.status(400).json({ error: "用户名需为 3-32 位字母、数字、下划线或连字符" });
    if (next === resolveAdminUsername(config, repositories)) return res.status(400).json({ error: "新用户名不能与当前相同" });
    repositories.setSetting("adminUsername", next);
    // 用户名即 JWT subject，变更后旧令牌全部失效，清除当前会话要求重新登录。
    res.clearCookie("workbench_admin", { path: "/" });
    res.json({ ok: true });
  });

  /** 运行时修改 IMAP 同步间隔并立即生效，无需重启服务。 */
  router.post("/sync-interval", (req, res) => {
    const seconds = Number(req.body?.seconds);
    if (!Number.isInteger(seconds) || seconds < 10 || seconds > 3600) {
      return res.status(400).json({ error: "同步间隔需为 10-3600 之间的整数" });
    }
    repositories.setSetting("inboxSyncIntervalSeconds", String(seconds));
    inboxSyncWorker.updateInterval();
    res.json({ ok: true, inboxSyncIntervalSeconds: seconds });
  });

  return router;
}
