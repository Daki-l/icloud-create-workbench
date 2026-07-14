import { createFileRoute, useNavigate } from '@tanstack/react-router';

import ExceptionPage from '@/components/ExceptionPage';

/** 渲染服务器错误页面。 */
const GeneralError = () => {
  const navigate = useNavigate();
  return (
    <ExceptionPage
      actionLabel="返回首页"
      description="服务暂时无法完成请求，请稍后重试。"
      title="500 · 服务异常"
      onAction={() => navigate({ to: '/home' })}
    />
  );
};

export const Route = createFileRoute('/(errors)/500')({
  component: GeneralError,
  staticData: { title: '500', i18nKey: 'route.500' }
});
