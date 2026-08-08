import { Router } from "express";
import { checkAdminPassword, hashPassword } from "../security.mjs";

/** 创建管理员设置路由。 */
export function createSettingsRouter({ config, repositories }) {
  const router = Router();

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

  return router;
}
