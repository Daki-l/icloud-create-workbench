import type { ErrorComponentProps } from '@tanstack/react-router';

import ExceptionPage from '@/components/ExceptionPage';

/** 渲染路由运行时错误并提供重试操作。 */
const ErrorPage = ({ error, reset }: ErrorComponentProps) => {
  return (
    <ExceptionPage
      actionLabel="重试"
      description={error.message || '页面加载时发生未知错误。'}
      title="页面加载失败"
      onAction={reset}
    />
  );
};

export default ErrorPage;
