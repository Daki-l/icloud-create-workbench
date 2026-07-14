import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import SystemLogo from '@/components/SystemLogo';

const pageStyle: React.CSSProperties = {
  background: 'var(--color-background-body)',
  minHeight: '100dvh',
  padding: 'var(--spacing-6)'
};

/** 渲染 Astryx 登录页面外壳。 */
const LoginLayout = () => {
  return (
    <Center axis="both" style={pageStyle}>
      <VStack gap={5} hAlign="center" style={{ maxWidth: 420, width: '100%' }}>
        <VStack gap={2} hAlign="center">
          <SystemLogo className="size-64px" />
          <Heading level={2}>iCloud 隐藏邮箱生产控制台</Heading>
          <Text color="secondary">使用管理员账号进入生产工作台</Text>
        </VStack>
        <Card padding={8} width="100%">
          <Outlet />
        </Card>
      </VStack>
    </Center>
  );
};

export const Route = createFileRoute('/(auth)/login')({
  component: LoginLayout,
  validateSearch: z.object({ redirect: z.string().startsWith('/').optional() }),
  beforeLoad: async ({ context, search }) => {
    if (context.isLoggedIn) {
      throw redirect({ to: search.redirect || context.getHomeRoute() });
    }
  },
  staticData: {
    title: 'login',
    i18nKey: 'route.login'
  }
});
