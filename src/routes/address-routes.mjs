import { Router } from "express";

/** 将 CSV 字段进行安全转义。 */
function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

/** 创建隐藏邮箱查询、导出和状态路由。 */
export function createAddressRouter(repositories) {
  const router = Router();

  /** 按账号、状态或关键词查询隐藏邮箱。 */
  router.get("/", (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(10, Number(req.query.pageSize || 20)));
    const result = repositories.pageAddresses({
      accountId: req.query.accountId,
      state: req.query.state,
      search: String(req.query.search || "").slice(0, 100)
    }, page, pageSize);
    res.json({ addresses: result.rows, pagination: { page, pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pageSize)) } });
  });

  /** 下载当前筛选结果的 UTF-8 CSV。 */
  router.get("/export", (req, res) => {
    const rows = repositories.listAddresses({ accountId: req.query.accountId, state: req.query.state });
    const csv = ["邮箱,标签,状态,来源,Apple ID,创建时间", ...rows.map(row => [
      row.email, row.label, row.state, row.source, row.appleIdMasked, row.createdAt
    ].map(csvCell).join(","))].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=hidden-addresses.csv");
    res.send(`\uFEFF${csv}`);
  });

  /** 批量修改邮箱状态。 */
  router.patch("/batch-state", (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(String))].slice(0, 200) : [];
    const state = String(req.body?.state || "");
    if (!ids.length) return res.status(400).json({ error: "请至少选择一个邮箱" });
    if (!["unused", "used", "trash"].includes(state)) return res.status(400).json({ error: "邮箱状态无效" });
    res.json({ updated: repositories.updateAddressStates(ids, state) });
  });

  /** 修改隐藏邮箱本地状态。 */
  router.patch("/:id/state", (req, res) => {
    const state = String(req.body?.state || "");
    if (!["unused", "used", "trash"].includes(state)) return res.status(400).json({ error: "邮箱状态无效" });
    if (!repositories.updateAddressState(req.params.id, state)) return res.status(404).json({ error: "邮箱不存在" });
    res.json({ ok: true });
  });
  return router;
}
