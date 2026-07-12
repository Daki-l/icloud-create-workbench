/** 创建每 CK IMAP 后台增量同步调度器。 */
export function createInboxSyncWorker({ config, repositories, inboxService }) {
  let timer = null;
  let ticking = false;

  /** 以限定并发执行当前到期的 IMAP 配置。 */
  async function tick() {
    if (ticking) return;
    ticking = true;
    try {
      const now = Date.now();
      const due = repositories.listInboxConfigs().filter(item => {
        const next = new Date(item.next_sync_at || 0).getTime();
        return !next || next <= now;
      });
      for (let index = 0; index < due.length; index += config.inboxSyncConcurrency) {
        const batch = due.slice(index, index + config.inboxSyncConcurrency);
        await Promise.allSettled(batch.map(item => inboxService.sync(item.account_id)));
      }
    } finally {
      ticking = false;
    }
  }

  /** 启动定时同步并立即检查一次。 */
  function start() {
    if (timer) return;
    timer = setInterval(() => void tick(), config.inboxSyncIntervalSeconds * 1000);
    timer.unref();
    void tick();
  }

  /** 停止后台同步定时器。 */
  function close() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, close, tick };
}
