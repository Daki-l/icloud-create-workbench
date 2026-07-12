import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { join } from "node:path";
import { createAuthRouter } from "./routes/auth-routes.mjs";
import { createAccountRouter } from "./routes/account-routes.mjs";
import { createAddressRouter } from "./routes/address-routes.mjs";
import { createInboxRouter } from "./routes/inbox-routes.mjs";
import { createTaskRouter } from "./routes/task-routes.mjs";
import { createCampaignRouter } from "./routes/campaign-routes.mjs";
import { requireAdmin, requireTrustedOrigin } from "./middleware.mjs";
import { verifyAdminToken } from "./security.mjs";

/** 创建配置完整的 Express 应用。 */
export function createApp({ config, repositories, icloudService, inboxService, campaignService }) {
  const app = express();
  const publicDir = join(process.cwd(), "public");
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: { directives: { "upgrade-insecure-requests": null } } }));
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(requireTrustedOrigin(config));

  /** 返回不含敏感信息的健康状态。 */
  app.get("/api/health", (req, res) => res.json({ ok: true, service: "icloud-create-workbench" }));
  app.use("/api/auth", createAuthRouter(config));

  const requireApiAdmin = requireAdmin(config);
  app.use("/api/icloud-accounts", requireApiAdmin, createAccountRouter({ repositories, icloudService }));
  app.use("/api/addresses", requireApiAdmin, createAddressRouter(repositories));
  app.use("/api/inbox", requireApiAdmin, createInboxRouter({ inboxService, repositories }));
  app.use("/api/generation-jobs", requireApiAdmin, createTaskRouter(repositories));
  app.use("/api/generation-campaigns", requireApiAdmin, createCampaignRouter(campaignService));

  app.use("/assets", express.static(join(publicDir, "assets"), {
    etag: false,
    maxAge: 0,
    setHeaders: response => response.setHeader("Cache-Control", "no-store, max-age=0")
  }));
  app.get("/login.html", (req, res) => res.sendFile(join(publicDir, "login.html")));
  app.get(["/", "/index.html", "/overview", "/accounts", "/tasks", "/addresses", "/inbox", "/guide"], (req, res) => {
    try {
      verifyAdminToken(req.cookies?.workbench_admin, config);
      res.sendFile(join(publicDir, "index.html"));
    } catch {
      res.redirect("/login.html");
    }
  });

  /** 将业务异常转换为统一 JSON，避免输出堆栈和敏感参数。 */
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = Number(error.status || 500);
    if (status >= 500) console.error(`${new Date().toISOString()} ${req.method} ${req.path}: ${error.message}`);
    const body = { error: status >= 500 ? "服务器处理请求失败" : error.message };
    if (error.cooldownUntil) body.cooldownUntil = error.cooldownUntil;
    res.status(status).json(body);
  });
  return app;
}
