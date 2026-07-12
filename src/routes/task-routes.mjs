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
  return router;
}
