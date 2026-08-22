import { resolveInboxSyncInterval } from "./inbox-interval.mjs";

/** 创建每 CK IMAP 后台增量同步调度器。 */
export function createInboxSyncWorker({ config, repositories, inboxService }) {
  let timer = null;
  let ticking = false;

  /** 读取生效同步间隔（DB 覆盖优先，回退环境变量）。 */
  function resolveInterval() {
    return resolveInboxSyncInterval(config, repositories);
  }

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

  /** 以当前生效间隔重新武装定时器。 */
  function arm() {
    if (timer) clearInterval(timer);
    timer = setInterval(() => void tick(), resolveInterval() * 1000);
    timer.unref();
  }

  /** 启动定时同步并立即检查一次。 */
  function start() {
    if (timer) return;
    arm();
    void tick();
  }

  /** 运行时更新同步间隔并立即生效，无需重启服务。 */
  function updateInterval() {
    arm();
  }

  /** 停止后台同步定时器。 */
  function close() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { start, close, tick, updateInterval, resolveInterval };
}
