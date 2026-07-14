import { Heading } from '@astryxdesign/core/Heading';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** 页面右侧操作区域。 */
  actions?: ReactNode;
  /** 页面辅助说明。 */
  description?: ReactNode;
  /** 页面标题。 */
  title: ReactNode;
}

/** 渲染管理页面统一标题区。 */
const PageHeader = ({ actions, description, title }: PageHeaderProps) => {
  return (
    <HStack hAlign="between" vAlign="center" wrap="wrap">
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        {description ? <Text color="secondary">{description}</Text> : null}
      </VStack>
      {actions}
    </HStack>
  );
};

export default PageHeader;
