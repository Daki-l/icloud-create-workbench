import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { EmptyState } from '@astryxdesign/core/EmptyState';

interface ExceptionPageProps {
  /** 操作按钮文字。 */
  actionLabel?: string;
  /** 异常说明。 */
  description: string;
  /** 操作按钮回调。 */
  onAction?: () => void;
  /** 异常标题。 */
  title: string;
}

const pageStyle: React.CSSProperties = { minHeight: '100dvh', padding: 'var(--spacing-6)' };

/** 渲染统一的 Astryx 异常状态页面。 */
const ExceptionPage = ({ actionLabel, description, onAction, title }: ExceptionPageProps) => {
  return (
    <Center axis="both" style={pageStyle}>
      <EmptyState
        actions={
          actionLabel && onAction ? <Button label={actionLabel} variant="primary" onClick={onAction} /> : undefined
        }
        description={description}
        title={title}
      />
    </Center>
  );
};

export default ExceptionPage;
