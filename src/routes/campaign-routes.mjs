import { Router } from "express";

/** 创建持续生产目标的管理路由。 */
export function createCampaignRouter(campaignService) {
  const router = Router();

  /** 返回全部生产目标和实时库存进度。 */
  router.get("/", (req, res) => res.json({ campaigns: campaignService.listCampaigns(100) }));

  /** 创建并唤醒一个持续生产目标。 */
  router.post("/", (req, res) => {
    const campaign = campaignService.createCampaign(req.body || {});
    void campaignService.wake().catch(error => console.error(`启动生产目标失败：${error.message}`));
    res.status(201).json({ campaign });
  });

  /** 修改目标后续批次使用的标签前缀。 */
  router.patch("/:id", (req, res) => res.json(campaignService.updateLabelPrefix(req.params.id, req.body || {})));

  /** 停止后续自动批次。 */
  router.post("/:id/stop", (req, res) => res.json(campaignService.stopCampaign(req.params.id)));

  /** 继续已停止的生产目标。 */
  router.post("/:id/resume", (req, res) => {
    const result = campaignService.resumeCampaign(req.params.id);
    void campaignService.wake().catch(error => console.error(`继续生产目标失败：${error.message}`));
    res.json(result);
  });
  return router;
}
