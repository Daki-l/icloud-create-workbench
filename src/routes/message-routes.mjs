import { Router } from "express";

/** 创建管理员单封邮件详情路由。 */
export function createMessageRouter(repositories) {
  const router = Router();

  /** 返回邮件纯文本和管理端沙箱 HTML 详情。 */
  router.get("/:id", (req, res) => {
    const message = repositories.getMessage(req.params.id);
    if (!message) return res.status(404).json({ error: "邮件不存在" });
    res.json({ message });
  });
  return router;
}
