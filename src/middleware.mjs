import { verifyAdminToken } from "./security.mjs";

/** 从 Cookie 校验管理员会话。 */
export function requireAdmin(config) {
  return (req, res, next) => {
    const token = req.cookies?.workbench_admin;
    if (!token) return res.status(401).json({ error: "请先登录" });
    try {
      req.admin = verifyAdminToken(token, config);
      next();
    } catch {
      res.clearCookie("workbench_admin", { path: "/" });
      res.status(401).json({ error: "登录已过期，请重新登录" });
    }
  };
}

/** 校验修改型请求来源，降低 Cookie 会话的 CSRF 风险。 */
export function requireTrustedOrigin(config) {
  return (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const origin = String(req.get("origin") || "").replace(/\/$/, "");
    if (origin !== config.appOrigin) return res.status(403).json({ error: "请求来源不受信任" });
    next();
  };
}
