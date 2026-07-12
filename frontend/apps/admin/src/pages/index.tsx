import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    // 根路由加载时 Provider 可能尚未刷新登录布尔值，以实际会话初始化结果为准。
    const userInfo = context.userInfo || await context.initAuth();

    if (userInfo) {
      throw redirect({ to: context.getHomeRoute() });
    }

    throw redirect({ to: '/login' });
  },
  staticData: {
    title: 'SkyrocAdmin'
  }
});
