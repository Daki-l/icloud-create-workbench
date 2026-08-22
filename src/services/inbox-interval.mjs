/** 读取生效的 IMAP 同步间隔（秒）：DB 覆盖优先且限定 10-3600，否则回退环境变量配置。 */
export function resolveInboxSyncInterval(config, repositories) {
  const override = Number(repositories.getSetting("inboxSyncIntervalSeconds"));
  return Number.isInteger(override) && override >= 10 && override <= 3600 ? override : config.inboxSyncIntervalSeconds;
}
