import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { checkAdminPassword, resolveAdminUsername, sessionCookieOptions, signAdminToken, verifyAdminToken } from "../security.mjs";

/** 创建管理员鉴权路由。 */
export function createAuthRouter({ config, repositories }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "登录失败次数过多，请稍后再试" }
  });

  /** 校验管理员凭据并设置 JWT Cookie。 */
  router.post("/login", loginLimiter, (req, res) => {
    const adminUsername = resolveAdminUsername(config, repositories);
    const usernameOk = String(req.body?.username || "") === adminUsername;
    const password = req.body?.password || "";
    const overrideHash = repositories.getSetting("adminPasswordHash");
    const passwordOk = checkAdminPassword(password, {
      adminPassword: config.adminPassword,
      adminPasswordHash: config.adminPasswordHash,
      overrideHash
    });
    if (!usernameOk || !passwordOk) return res.status(401).json({ error: "用户名或密码错误" });
    res.cookie("workbench_admin", signAdminToken(config, repositories), sessionCookieOptions(config));
    res.json({ username: adminUsername });
  });

  /** 清除管理员会话。 */
  router.post("/logout", (req, res) => {
    res.clearCookie("workbench_admin", { ...sessionCookieOptions(config), maxAge: undefined });
    res.json({ ok: true });
  });

  /** 返回当前管理员会话状态。 */
  router.get("/me", (req, res) => {
    try {
      verifyAdminToken(req.cookies?.workbench_admin, config, repositories);
      res.json({ username: resolveAdminUsername(config, repositories) });
    } catch {
      res.status(401).json({ error: "未登录" });
    }
  });
  return router;
}
