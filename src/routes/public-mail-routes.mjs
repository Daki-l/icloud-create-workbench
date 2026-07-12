import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

/** 创建无管理员会话的公开最新邮件接口。 */
export function createPublicMailRouter(config, publicMailService) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: config.publicMailRateLimit,
    keyGenerator: req => `${ipKeyGenerator(req.ip)}:${req.params.token || "anonymous"}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "请求过于频繁" }
  });

  /** 为只读公开接口设置跨域和禁用缓存响应头。 */
  router.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  /** 根据隐私邮箱和独立密钥返回最新邮件。 */
  router.get("/mail/:email/:token/latest", limiter, (req, res) => {
    const result = publicMailService.getLatest(req.params.email, req.params.token);
    if (!result) return res.status(404).json({ error: "邮件地址或访问密钥无效" });
    res.json(result);
  });
  return router;
}
