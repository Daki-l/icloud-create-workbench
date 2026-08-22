import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    // 根路由加载时 Provider 可能尚未刷新登录布尔值，以实际会话初始化结果为准。
    const userInfo = context.userInfo || await context.initAuth();

    if (userInfo) {
      throw redirect({ to: context.getHomeRoute() });
    }

    // 未登录不暴露登录入口，跳转到 404 页（生产环境由服务端直接返回静默 404，不会进入此分支）。
    throw redirect({ to: '/404' });
  },
  staticData: {
    title: 'SkyrocAdmin'
  }
});
