import type { RequestInstance } from '@skyroc/axios';
import { BACKEND_ERROR_CODE } from '@skyroc/axios';
/* eslint-disable max-params */
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { getAuthorization, handleExpiredRequest, showErrorMsg } from './shared';
import type { RequestAdapter, RequestInstanceState, ServiceCodes } from './types';

/** 后端业务错误处理（response.data.code 非成功码） */
export async function backEndFail(
  response: AxiosResponse<{ code: string | number; data: any; msg: string }>,
  instance: AxiosInstance,
  request: RequestInstance<any, RequestInstanceState>,
  adapter: RequestAdapter,
  codes: ServiceCodes
) {
  const responseCode = String(response.data.code);

  function handleLogout() {
    const fullPath = adapter.getCurrentPath();
    adapter.redirectToLogin(fullPath);
  }

  function logoutAndCleanup() {
    handleLogout();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleLogout);
    }
    request.state.errMsgStack = request.state.errMsgStack.filter(msg => msg !== response.data.msg);
  }

  // 登出码：直接登出 + 跳转
  if (codes.logout.includes(responseCode)) {
    adapter.showErrorMessage(adapter.t('request.logoutMsg'));
    handleLogout();
    return null;
  }

  // 弹窗登出码：弹窗确认后登出
  if (codes.modalLogout.includes(responseCode) && !request.state.errMsgStack?.includes(response.data.msg)) {
    request.state.errMsgStack = [...(request.state.errMsgStack || []), response.data.msg];

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleLogout);
    }

    adapter.showErrorModal({
      content: response.data.msg,
      maskClosable: false,
      onConfirm() {
        logoutAndCleanup();
      },
      title: adapter.t('common.error')
    });

    return null;
  }

  // token 过期码：刷新 token 后重试
  if (codes.expiredToken.includes(responseCode)) {
    const success = await handleExpiredRequest(adapter, request.state);
    if (success) {
      const Authorization = getAuthorization(adapter);
      Object.assign(response.config.headers, { Authorization });
      return instance.request(response.config) as Promise<AxiosResponse>;
    }
  }

  return null;
}

/** 网络 / 请求层错误处理 */
export function handleError(
  error: AxiosError<{ code?: string | number; msg?: string }>,
  request: RequestInstance<any, RequestInstanceState>,
  adapter: RequestAdapter,
  codes: ServiceCodes
) {
  let message = error.message;
  let backendErrorCode = '';

  if (error.code === BACKEND_ERROR_CODE) {
    message = error.response?.data?.msg || message;
    backendErrorCode = String(error.response?.data?.code || '');
  }

  // 弹窗登出码的错误不在此处展示（已由 backEndFail 弹窗处理）
  if (codes.modalLogout.includes(backendErrorCode)) {
    return;
  }

  // token 过期码不展示错误（正在刷新重试）
  if (codes.expiredToken.includes(backendErrorCode)) {
    return;
  }

  showErrorMsg(adapter, request.state, message);
}
