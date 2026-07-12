import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { sessionCookieOptions, signAdminToken, verifyAdminToken, verifyPassword } from "../security.mjs";

/** 创建管理员鉴权路由。 */
export function createAuthRouter(config) {
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
    const usernameOk = String(req.body?.username || "") === config.adminUsername;
    const passwordOk = verifyPassword(req.body?.password || "", config.adminPasswordHash);
    if (!usernameOk || !passwordOk) return res.status(401).json({ error: "用户名或密码错误" });
    res.cookie("workbench_admin", signAdminToken(config), sessionCookieOptions(config));
    res.json({ username: config.adminUsername });
  });

  /** 清除管理员会话。 */
  router.post("/logout", (req, res) => {
    res.clearCookie("workbench_admin", { ...sessionCookieOptions(config), maxAge: undefined });
    res.json({ ok: true });
  });

  /** 返回当前管理员会话状态。 */
  router.get("/me", (req, res) => {
    try {
      verifyAdminToken(req.cookies?.workbench_admin, config);
      res.json({ username: config.adminUsername });
    } catch {
      res.status(401).json({ error: "未登录" });
    }
  });
  return router;
}
