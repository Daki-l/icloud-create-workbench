import { Center } from '@astryxdesign/core/Center';
import { Spinner } from '@astryxdesign/core/Spinner';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

import SystemLogo from '@/components/SystemLogo';

/** 渲染全局路由加载状态。 */
const GlobalLoading = () => {
  return (
    <Center axis="both" style={{ minHeight: '100dvh' }}>
      <VStack gap={4} hAlign="center">
        <SystemLogo className="size-72px" />
        <Spinner label="正在加载 iCloud 工作台" />
        <Text color="secondary">正在加载 iCloud 工作台</Text>
      </VStack>
    </Center>
  );
};

export default GlobalLoading;
