import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { HStack } from '@astryxdesign/core/Stack';
import type { ReactNode } from 'react';

interface ActionDialogProps {
  /** 弹窗主体内容。 */
  children: ReactNode;
  /** 确认按钮是否加载中。 */
  isLoading?: boolean;
  /** 弹窗是否打开。 */
  isOpen: boolean;
  /** 打开状态变化回调。 */
  onOpenChange: (open: boolean) => void;
  /** 确认操作。 */
  onPrimary: () => void;
  /** 确认按钮文字。 */
  primaryLabel: string;
  /** 弹窗副标题。 */
  subtitle?: string;
  /** 弹窗标题。 */
  title: string;
  /** 弹窗宽度。 */
  width?: number | string;
}

/** 渲染带取消和确认操作的统一 Astryx 表单弹窗。 */
const ActionDialog = (props: ActionDialogProps) => {
  const { children, isLoading, isOpen, onOpenChange, onPrimary, primaryLabel, subtitle, title, width = 520 } = props;

  return (
    <Dialog isOpen={isOpen} maxHeight="85vh" padding={4} purpose="form" width={width} onOpenChange={onOpenChange}>
      <Layout
        content={
          <LayoutContent isScrollable>
            {children}
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="取消" onClick={() => onOpenChange(false)} />
              <Button isLoading={isLoading} label={primaryLabel} variant="primary" onClick={onPrimary} />
            </HStack>
          </LayoutFooter>
        }
        header={<DialogHeader subtitle={subtitle} title={title} onOpenChange={onOpenChange} />}
      />
    </Dialog>
  );
};

export default ActionDialog;
