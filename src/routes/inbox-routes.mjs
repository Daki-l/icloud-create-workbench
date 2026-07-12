import { Router } from "express";

/** 创建 IMAP 配置、同步和邮件查询路由。 */
export function createInboxRouter({ inboxService, repositories }) {
  const router = Router();

  /** 返回脱敏后的 IMAP 配置。 */
  router.get("/config", (req, res) => {
    if (!req.query.accountId) return res.status(400).json({ error: "请选择 CK 账号" });
    res.json(inboxService.getConfig(String(req.query.accountId)));
  });

  /** 保存 IMAP 配置。 */
  router.put("/config", (req, res) => {
    if (!req.body?.accountId) return res.status(400).json({ error: "请选择 CK 账号" });
    res.json(inboxService.saveConfig(String(req.body.accountId), req.body || {}));
  });

  /** 立即同步最近一百封邮件。 */
  router.post("/sync", async (req, res) => {
    if (!req.body?.accountId) return res.status(400).json({ error: "请选择 CK 账号" });
    res.json(await inboxService.sync(String(req.body.accountId)));
  });

  /** 返回最近邮件和验证码。 */
  router.get("/messages", (req, res) => {
    const accountId = String(req.query.accountId || "");
    if (!accountId) return res.status(400).json({ error: "请选择 CK 账号" });
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)));
    const result = repositories.pageMessages(accountId, page, pageSize);
    res.json({ messages: result.rows, pagination: { page, pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pageSize)) } });
  });
  return router;
}
