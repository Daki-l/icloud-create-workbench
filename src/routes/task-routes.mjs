import { Router } from "express";

/** 创建跨账号生成任务中心路由。 */
export function createTaskRouter(repositories) {
  const router = Router();

  /** 返回所有账号最近的生成任务。 */
  router.get("/", (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)));
    const result = repositories.pageAllJobs(page, pageSize);
    res.json({ jobs: result.rows, pagination: { page, pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pageSize)) } });
  });

  /** 强制清理运行超过 5 分钟的僵尸生成任务，解除对后续生产的阻塞。 */
  router.post("/recover", (req, res) => {
    const recovered = repositories.recoverStaleJobs(5 * 60_000);
    res.json({ recovered });
  });
  return router;
}
