import { createRequest } from '@skyroc/axios';
import type { AxiosResponse } from 'axios';
import { backEndFail, handleError } from './error-handler';
import { getAuthorization } from './shared';
import type { CreateRequestOptions, RequestInstanceState } from './types';

/**
 * 创建平台无关的请求实例
 *
 * 通过 adapter 注入平台差异（UI 反馈、认证、导航、i18n）， 使错误处理、token 刷新等逻辑可跨端复用。
 */
export function createAppRequest(options: CreateRequestOptions) {
  const { adapter, axiosConfig, codes } = options;

  const request = createRequest<{ code: string | number; data: any; msg: string }, any, RequestInstanceState>(
    axiosConfig,
    {
      defaultState: {
        errMsgStack: [],
        refreshTokenPromise: null
      },
      isBackendSuccess:
        options.isBackendSuccess ??
        ((response: AxiosResponse<{ code: string | number }>) => {
          return String(response.data.code) === codes.success;
        }),
      async onBackendFail(response, instance) {
        await backEndFail(response, instance, request, adapter, codes);
      },
      onError(error) {
        handleError(error, request, adapter, codes);
      },
      async onRequest(config) {
        const Authorization = getAuthorization(adapter);
        Object.assign(config.headers, { Authorization });
        return config;
      },
      transform:
        options.transform ??
        ((response: AxiosResponse<{ data: any }>) => {
          return response.data.data;
        })
    }
  );

  // createRequest 内部将 state 初始化为 {}，手动补全默认值
  const defaultState: RequestInstanceState = { errMsgStack: [], refreshTokenPromise: null };
  request.state = Object.assign(defaultState, request.state);

  return request;
}
