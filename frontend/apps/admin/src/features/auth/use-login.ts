import { useLoading } from '@skyroc/hooks';
import { useSearch } from '@tanstack/react-router';

import { useLoginMutation } from '@/service/api';

export function useInitLogin() {
  const { endLoading, loading, startLoading } = useLoading();

  const search = useSearch({ from: '/(auth)/login/' });

  const { mutate: toLogin } = useLoginMutation();

  async function login(params: Api.Auth.LoginParams, redirect = true) {
    if (loading) return;

    startLoading();

    toLogin(params, {
      onError: () => {
        endLoading();
      },
      onSuccess: async () => {
        // 使用完整页面导航重新读取 HttpOnly Cookie，避免 SPA 登录状态与路由上下文发生时序竞争。
        window.location.replace(redirect ? search.redirect || '/' : '/');
      }
    });
  }

  return {
    login,
    loading
  };
}
