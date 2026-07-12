/** @vitest-environment node */
import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { createAxiosConfig, createDefaultOptions, createRetryOptions } from '../src/options';

// ==================== 测试辅助函数 ====================

const customCheck = (response: AxiosResponse) => response.data.code === 0;
const customTransform = async (response: AxiosResponse) => response.data.inner;
const deprecatedTransform = async (response: AxiosResponse) => response.data.legacy;

// ==================== createDefaultOptions ====================

describe('createDefaultOptions', () => {
  it('无参数时应返回完整的默认选项', () => {
    const opts = createDefaultOptions();

    expect(opts.defaultState).toEqual({});
    expect(opts.isBackendSuccess({} as AxiosResponse)).toBe(true);
    expect(typeof opts.onBackendFail).toBe('function');
    expect(typeof opts.onError).toBe('function');
    expect(typeof opts.onRequest).toBe('function');
    expect(typeof opts.transform).toBe('function');
  });

  it('默认 transform 应返回 response.data', async () => {
    const opts = createDefaultOptions();
    const mockResponse = { data: { code: 200, items: [1] } } as AxiosResponse;

    const result = await opts.transform(mockResponse);

    expect(result).toEqual({ code: 200, items: [1] });
  });

  it('传入 transform 时应使用自定义 transform', async () => {
    const opts = createDefaultOptions({ transform: customTransform });

    const mockResponse = { data: { inner: 'extracted' } } as AxiosResponse;
    const result = await opts.transform(mockResponse);

    expect(result).toBe('extracted');
  });

  it('未传 transform 但传了 transformBackendResponse 时应回退使用 transformBackendResponse', async () => {
    const opts = createDefaultOptions({ transformBackendResponse: deprecatedTransform });

    const mockResponse = { data: { legacy: 'old-style' } } as AxiosResponse;
    const result = await opts.transform(mockResponse);

    expect(result).toBe('old-style');
  });

  it('同时传 transform 和 transformBackendResponse 时应优先使用 transform', async () => {
    const opts = createDefaultOptions<{ new: string; old: string }, string>({
      transform: async response => response.data.new,
      transformBackendResponse: async response => response.data.old
    });

    const mockResponse = { data: { new: 'preferred', old: 'ignored' } } as AxiosResponse;
    const result = await opts.transform(mockResponse);

    expect(result).toBe('preferred');
  });

  it('自定义选项应覆盖默认值', () => {
    const opts = createDefaultOptions({ isBackendSuccess: customCheck });

    expect(opts.isBackendSuccess({ data: { code: 0 } } as AxiosResponse)).toBe(true);
    expect(opts.isBackendSuccess({ data: { code: 1 } } as AxiosResponse)).toBe(false);
  });

  it('默认 transformBackendResponse 应返回 response.data', async () => {
    const opts = createDefaultOptions();
    const mockResponse = { data: { code: 200 } } as AxiosResponse;

    const result = await opts.transformBackendResponse(mockResponse);

    expect(result).toEqual({ code: 200 });
  });

  it('defaultState 应支持自定义', () => {
    const opts = createDefaultOptions({ defaultState: { token: 'abc' } as any });

    expect(opts.defaultState).toEqual({ token: 'abc' });
  });
});

// ==================== createRetryOptions ====================

describe('createRetryOptions', () => {
  it('无参数时 retries 应为 0', () => {
    const config = createRetryOptions();

    expect(config.retries).toBe(0);
  });

  it('传入配置应覆盖默认值', () => {
    const config = createRetryOptions({ retries: 3 } as any);

    expect(config.retries).toBe(3);
  });
});

// ==================== createAxiosConfig ====================

describe('createAxiosConfig', () => {
  it('默认 timeout 应为 10 秒', () => {
    const config = createAxiosConfig();

    expect(config.timeout).toBe(10_000);
  });

  it('默认 Content-Type 应为 application/json', () => {
    const config = createAxiosConfig();

    expect((config.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('默认 validateStatus 应使用 isHttpSuccess', () => {
    const config = createAxiosConfig();

    expect(config.validateStatus!(200)).toBe(true);
    expect(config.validateStatus!(304)).toBe(true);
    expect(config.validateStatus!(404)).toBe(false);
    expect(config.validateStatus!(500)).toBe(false);
  });

  it('默认 paramsSerializer 应使用 qs.stringify', () => {
    const config = createAxiosConfig();
    const serializer = config.paramsSerializer as (params: any) => string;

    expect(serializer({ a: 1, b: [2, 3] })).toBe('a=1&b%5B0%5D=2&b%5B1%5D=3');
  });

  it('自定义配置应覆盖默认值', () => {
    const config = createAxiosConfig({ timeout: 30_000, baseURL: 'http://example.com' });

    expect(config.timeout).toBe(30_000);
    expect(config.baseURL).toBe('http://example.com');
  });
});
