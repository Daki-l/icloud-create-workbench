import { createFileRoute, useNavigate } from '@tanstack/react-router';

import ExceptionPage from '@/components/ExceptionPage';

/** 渲染无权限页面。 */
const NotAuth = () => {
  const navigate = useNavigate();
  return (
    <ExceptionPage
      actionLabel="返回首页"
      description="当前账号没有访问此页面的权限。"
      title="403 · 无访问权限"
      onAction={() => navigate({ to: '/home' })}
    />
  );
};

export const Route = createFileRoute('/(errors)/403')({
  component: NotAuth,
  staticData: { title: '403', i18nKey: 'route.403' }
});
