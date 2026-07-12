import { Router } from "express";

/** 创建 iCloud CK 与生成任务路由。 */
export function createAccountRouter({ repositories, icloudService }) {
  const router = Router();

  /** 返回全部 CK 工作台摘要。 */
  router.get("/", (req, res) => res.json({ accounts: repositories.listAccounts() }));

  /** 导入并校验一条 CK。 */
  router.post("/import", async (req, res) => {
    const account = await icloudService.importAccount(req.body?.cookie, req.body?.region || "auto");
    res.status(201).json({ account: repositories.getAccount(account.id) });
  });

  /** 返回单个账号、邮箱和任务详情。 */
  router.get("/:id", (req, res) => {
    const account = repositories.getAccount(req.params.id);
    if (!account || account.status === "deleted") return res.status(404).json({ error: "账号不存在" });
    res.json({
      account,
      addresses: repositories.listAddresses({ accountId: req.params.id }),
      jobs: repositories.listJobs(req.params.id)
    });
  });

  /** 更新指定账号的 CK。 */
  router.put("/:id/cookie", async (req, res) => {
    await icloudService.updateCookie(req.params.id, req.body?.cookie, req.body?.region || "auto");
    res.json({ account: repositories.getAccount(req.params.id) });
  });

  /** 软删除账号并清除加密 CK。 */
  router.delete("/:id", (req, res) => {
    if (!repositories.deleteAccount(req.params.id)) return res.status(404).json({ error: "账号不存在" });
    res.json({ ok: true });
  });

  /** 从 Apple 同步已有隐藏邮箱。 */
  router.post("/:id/sync", async (req, res) => res.json(await icloudService.syncAddresses(req.params.id)));

  /** 创建并执行一批隐藏邮箱生成任务。 */
  router.post("/:id/generation-jobs", async (req, res) => {
    const result = await icloudService.generate(req.params.id, req.body?.count, req.body?.labelPrefix);
    res.status(201).json(result);
  });

  /** 返回指定账号的生成任务记录。 */
  router.get("/:id/generation-jobs", (req, res) => res.json({ jobs: repositories.listJobs(req.params.id) }));
  return router;
}
