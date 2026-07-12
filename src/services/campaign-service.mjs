/** 创建持续生产目标与后台调度服务。 */
export function createCampaignService({ config, repositories, icloudService }) {
  let ticking = false;
  let timer = null;

  /** 计算账号下一次允许执行的时间。 */
  function nextAllowedTime(account) {
    const cooldown = new Date(account?.cooldown_until || 0).getTime();
    return new Date(Math.max(Date.now(), Number.isFinite(cooldown) ? cooldown : 0)).toISOString();
  }

  /** 创建一个默认目标为 700 的持续生产任务。 */
  function createCampaign(input) {
    const account = repositories.getAccountInternal(input.accountId);
    if (!account || account.status === "deleted") throw Object.assign(new Error("CK 账号不存在"), { status: 404 });
    if (repositories.findOpenCampaign(input.accountId)) {
      throw Object.assign(new Error("该 CK 已有未完成的生产目标，请停止或继续现有任务"), { status: 409 });
    }
    const targetTotal = Number(input.targetTotal || config.targetDefault);
    const batchSize = Number(input.batchSize || config.batchLimit);
    const labelPrefix = String(input.labelPrefix || account.label_prefix || "changsheng").trim();
    if (!Number.isInteger(targetTotal) || targetTotal < 1 || targetTotal > 700) {
      throw Object.assign(new Error("目标库存必须是 1-700 之间的整数"), { status: 400 });
    }
    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > config.batchLimit) {
      throw Object.assign(new Error(`每批数量必须是 1-${config.batchLimit}`), { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{1,24}$/.test(labelPrefix)) {
      throw Object.assign(new Error("标签前缀格式无效"), { status: 400 });
    }
    const currentTotal = repositories.countAddresses(input.accountId);
    if (currentTotal >= targetTotal) {
      throw Object.assign(new Error(`当前库存已达到 ${currentTotal}，无需创建该目标`), { status: 400 });
    }
    return repositories.createCampaign({
      accountId: input.accountId,
      targetTotal,
      batchSize,
      labelPrefix,
      nextRunAt: nextAllowedTime(account)
    });
  }

  /** 停止目标的后续自动批次。 */
  function stopCampaign(id) {
    if (!repositories.stopCampaign(id)) throw Object.assign(new Error("运行中的生产目标不存在"), { status: 404 });
    return { ok: true };
  }

  /** 继续一个已经停止的生产目标。 */
  function resumeCampaign(id) {
    const campaign = repositories.getCampaignInternal(id);
    if (!campaign) throw Object.assign(new Error("生产目标不存在"), { status: 404 });
    const account = repositories.getAccountInternal(campaign.account_id);
    if (!repositories.resumeCampaign(id, nextAllowedTime(account))) {
      throw Object.assign(new Error("该生产目标当前不能继续"), { status: 409 });
    }
    return { ok: true };
  }

  /** 执行单个到期生产目标的一批生成。 */
  async function runCampaign(campaign) {
    const currentTotal = repositories.countAddresses(campaign.account_id);
    if (currentTotal >= campaign.target_total) return repositories.completeCampaign(campaign.id);
    const requestedCount = Math.min(campaign.batch_size, campaign.target_total - currentTotal);
    try {
      const result = await icloudService.generate(campaign.account_id, requestedCount, campaign.label_prefix);
      const generatedCount = result.generated.length;
      const updatedTotal = repositories.countAddresses(campaign.account_id);
      const account = repositories.getAccountInternal(campaign.account_id);
      const complete = updatedTotal >= campaign.target_total;
      const nextRunAt = complete ? null : generatedCount
        ? nextAllowedTime(account)
        : new Date(Date.now() + config.retryMinutes * 60_000).toISOString();
      const lastError = result.errors.map(item => item.error).join("；");
      repositories.recordCampaignRun(campaign.id, generatedCount, nextRunAt, lastError);
      if (complete) repositories.completeCampaign(campaign.id);
    } catch (error) {
      if (error.status === 404) return repositories.stopCampaign(campaign.id);
      const nextRunAt = error.cooldownUntil || new Date(Date.now() + config.retryMinutes * 60_000).toISOString();
      repositories.recordCampaignRun(campaign.id, 0, nextRunAt, error.message);
    }
  }

  /** 扫描并执行当前到期的生产目标。 */
  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      const due = repositories.listDueCampaigns(new Date().toISOString());
      for (const campaign of due) await runCampaign(campaign);
    } finally {
      ticking = false;
    }
  }

  /** 启动五秒一次的轻量后台调度循环。 */
  function start() {
    if (timer) return;
    timer = setInterval(() => tick().catch(error => console.error(`生产任务调度失败：${error.message}`)), 5000);
    timer.unref();
    void tick();
  }

  /** 停止后台调度循环。 */
  function close() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return {
    createCampaign,
    stopCampaign,
    resumeCampaign,
    listCampaigns: limit => repositories.listCampaigns(limit),
    wake: tick,
    start,
    close
  };
}
