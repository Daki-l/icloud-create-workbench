import { useLoading } from '@skyroc/hooks';
import { useSearch } from '@tanstack/react-router';
import { useState } from 'react';

import { useLoginMutation } from '@/service/api';

export function useInitLogin() {
  const { endLoading, loading, startLoading } = useLoading();
  const [error, setError] = useState('');

  const search = useSearch({ from: '/(auth)/login/' });

  const { mutate: toLogin } = useLoginMutation();

  async function login(params: Api.Auth.LoginParams, redirect = true) {
    if (loading) return;

    setError('');
    startLoading();

    toLogin(params, {
      onError: loginError => {
        setError(loginError instanceof Error ? loginError.message : '登录失败');
        endLoading();
      },
      onSuccess: async () => {
        // 使用完整页面导航重新读取 HttpOnly Cookie，避免 SPA 登录状态与路由上下文发生时序竞争。
        window.location.replace(redirect ? search.redirect || '/' : '/');
      }
    });
  }

  /** 清理当前登录错误。 */
  function clearError() {
    setError('');
  }

  return {
    clearError,
    error,
    login,
    loading
  };
}
