import { createFileRoute, useNavigate } from '@tanstack/react-router';

import ExceptionPage from '@/components/ExceptionPage';

/** 渲染显式 404 路由。 */
const NotFound = () => {
  const navigate = useNavigate();
  return (
    <ExceptionPage
      actionLabel="返回首页"
      description="请求的页面不存在或已经移动。"
      title="404 · 页面未找到"
      onAction={() => navigate({ to: '/home' })}
    />
  );
};

export const Route = createFileRoute('/(errors)/404')({
  component: NotFound,
  staticData: { title: '404', i18nKey: 'route.404' }
});
