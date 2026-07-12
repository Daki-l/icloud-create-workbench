import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

export interface GetBuildTimeOptions {
  /** Output format passed to dayjs. */
  format?: string;

  /** Timezone used to render build time. */
  timezone?: string;
}

export function getBuildTime(options: GetBuildTimeOptions = {}) {
  const { format = 'YYYY-MM-DD HH:mm:ss', timezone: timezoneName = 'Asia/Shanghai' } = options;

  dayjs.extend(utc);
  dayjs.extend(timezone);

  return dayjs.tz(Date.now(), timezoneName).format(format);
}
