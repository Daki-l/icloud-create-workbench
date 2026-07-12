import process from 'node:process';

import json5 from 'json5';
import { bgRed, bgYellow, green, lightBlue } from 'kolorist';
import type { HttpProxy, ProxyOptions } from 'vite';

export interface AdminViteServiceConfigItem {
  /** Backend service base url. */
  baseURL: string;

  /** Local proxy path prefix. */
  proxyPattern: string;
}

export interface AdminViteServiceConfig extends AdminViteServiceConfigItem {
  /** Extra backend services that share the same proxy behavior. */
  other?: AdminViteServiceConfigItem[];
}

export interface AdminViteServiceEnv {
  /** Other backend service base urls, encoded as a JSON object string. */
  VITE_OTHER_SERVICE_BASE_URL?: string;

  /** Main backend service base url. */
  VITE_SERVICE_BASE_URL?: string;
}

export interface CreateAdminViteServiceConfigOptions {
  /** Other backend service base urls. */
  otherServiceBaseURL?: Record<string, string> | string;

  /** Main backend service base url. */
  serviceBaseURL?: string;
}

export interface CreateAdminViteProxyOptions {
  /** Whether proxy creation is enabled for the current command. */
  enabled?: boolean;

  /** Whether request and target urls are printed in the terminal. */
  enableLog?: boolean;

  /** Service config produced by the host application. */
  serviceConfig: AdminViteServiceConfig;
}

type ServiceBaseURLMap = Record<string, string>;

export function createAdminViteServiceConfig(
  env: AdminViteServiceEnv,
  options: CreateAdminViteServiceConfigOptions = {}
): AdminViteServiceConfig {
  const { otherServiceBaseURL = env.VITE_OTHER_SERVICE_BASE_URL, serviceBaseURL = env.VITE_SERVICE_BASE_URL } = options;
  const other = resolveOtherServiceBaseURL(otherServiceBaseURL);

  return {
    baseURL: serviceBaseURL ?? '',
    other: Object.entries(other).map(([key, baseURL]) => {
      return {
        baseURL,
        proxyPattern: createAdminViteProxyPattern(key)
      };
    }),
    proxyPattern: createAdminViteProxyPattern()
  };
}

export function createAdminViteProxy(options: CreateAdminViteProxyOptions) {
  const { enabled = true, enableLog = false, serviceConfig } = options;

  if (!enabled) return undefined;

  const proxy: Record<string, ProxyOptions> = createProxyItem(serviceConfig, enableLog);

  serviceConfig.other?.forEach(item => {
    Object.assign(proxy, createProxyItem(item, enableLog));
  });

  return proxy;
}

export function createAdminViteProxyPattern(key?: string) {
  if (!key) return '/proxy-default';

  return `/proxy-${key}`;
}

function createProxyItem(item: AdminViteServiceConfigItem, enableLog: boolean) {
  const proxy: Record<string, ProxyOptions> = {};

  proxy[item.proxyPattern] = {
    changeOrigin: true,
    configure: (_proxy: HttpProxy.ProxyServer, options: ProxyOptions) => {
      _proxy.on('proxyReq', (_proxyReq, req) => {
        if (!enableLog) return;

        const requestUrl = `${lightBlue('[proxy url]')}: ${bgYellow(` ${req.method} `)} ${green(`${item.proxyPattern}${req.url}`)}`;
        const proxyUrl = `${lightBlue('[real request url]')}: ${green(`${options.target}${req.url}`)}`;

        process.stdout.write(`${requestUrl}\n${proxyUrl}\n`);
      });
      _proxy.on('error', (_err, req) => {
        if (!enableLog) return;

        process.stdout.write(`${bgRed(`Error: ${req.method} `)} ${green(`${options.target}${req.url}`)}\n`);
      });
    },
    rewrite: path => rewriteProxyPath(path, item.proxyPattern),
    target: item.baseURL
  };

  return proxy;
}

function rewriteProxyPath(path: string, proxyPattern: string) {
  if (!path.startsWith(proxyPattern)) return path;

  return path.slice(proxyPattern.length);
}

function resolveOtherServiceBaseURL(otherServiceBaseURL: ServiceBaseURLMap | string | undefined) {
  if (!otherServiceBaseURL) return {};

  if (typeof otherServiceBaseURL === 'object') return otherServiceBaseURL;

  const json = otherServiceBaseURL.trim().replace(/^`/, '').replace(/`$/, '').trim();

  try {
    const value = json5.parse(json) as unknown;

    if (isServiceBaseURLMap(value)) return value;
  } catch {
    // Fallback below keeps invalid env handling in one place.
  }

  process.stderr.write('VITE_OTHER_SERVICE_BASE_URL is not a valid json5 string\n');

  return {};
}

function isServiceBaseURLMap(value: unknown): value is ServiceBaseURLMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.values(value).every(item => typeof item === 'string');
}
