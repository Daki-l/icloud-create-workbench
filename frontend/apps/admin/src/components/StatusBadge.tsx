import { Badge, type BadgeProps } from '@astryxdesign/core/Badge';

interface StatusBadgeProps {
  /** 原始状态值。 */
  value?: string;
}

interface StatusPresentation {
  label: string;
  variant: BadgeProps['variant'];
}

const STATUS_MAP: Record<string, StatusPresentation> = {
  china: { label: '中国区', variant: 'orange' },
  global: { label: '全球区', variant: 'blue' },
  unused: { label: '未使用', variant: 'green' },
  used: { label: '已使用', variant: 'blue' },
  trash: { label: '垃圾箱', variant: 'red' },
  active: { label: '有效', variant: 'success' },
  expired: { label: '已过期', variant: 'error' },
  running: { label: '运行中', variant: 'info' },
  stopped: { label: '已停止', variant: 'warning' },
  completed: { label: '已完成', variant: 'success' },
  failed: { label: '失败', variant: 'error' },
  success: { label: '成功', variant: 'success' },
  pending: { label: '等待中', variant: 'warning' }
};

/** 将后端状态转换为统一的中文徽章。 */
const StatusBadge = ({ value = '' }: StatusBadgeProps) => {
  const presentation = STATUS_MAP[value] || { label: value || '-', variant: 'neutral' as const };
  return <Badge label={presentation.label} variant={presentation.variant} />;
};

export default StatusBadge;
