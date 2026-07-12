const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

const shanghaiDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  second: '2-digit',
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric'
});

/** 将接口时间统一格式化为上海时区。 */
export function formatShanghaiTime(value?: Date | number | string | null, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : shanghaiDateTimeFormatter.format(date);
}
