import { useNavigate } from '@tanstack/react-router';

import ExceptionPage from '@/components/ExceptionPage';

/** 渲染全局未找到页面。 */
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

export default NotFound;
