import AutoImport from 'unplugin-auto-import/vite';
import IconsResolver from 'unplugin-icons/resolver';

import type { AdminViteIconOptions } from '../types';
import { resolveAdminIconOptions } from './icon-utils';

type AutoImportOptions = NonNullable<Parameters<typeof AutoImport>[0]>;

export interface SetupAdminAutoImportAdminOptions extends AdminViteIconOptions {
  /** Whether Ant Design A-prefixed component auto import is enabled. */
  antd?: boolean;
}

export type SetupAdminAutoImportOptions = AutoImportOptions & SetupAdminAutoImportAdminOptions;

export type ResolvedSetupAdminAutoImportOptions = SetupAdminAutoImportOptions;

const ADMIN_AUTO_IMPORT_OPTION_KEYS = new Set([
  'antd',
  'collectionName',
  'iconPrefix',
  'localIconPath',
  'localIconPrefix',
  'scale',
  'transformSvg'
]);

const TSR_SPLIT_RE = /\.[tj]sx?(\?.*)?$/;

export function setupAdminAutoImport(options: ResolvedSetupAdminAutoImportOptions = {}) {
  const autoImportOptions = createAutoImportOptions(options);
  const {
    dirs = ['src/components/**', 'src/config.ts'],
    dts = 'src/types/auto-imports.d.ts',
    imports = ['react', { from: 'react', imports: ['FC'], type: true }, 'react-i18next', 'ahooks'],
    include = [TSR_SPLIT_RE],
    resolvers = []
  } = autoImportOptions;
  const { antd = true } = options;

  const iconOptions = resolveAdminIconOptions(options);

  return AutoImport({
    ...autoImportOptions,
    dirs,
    dts,
    imports,
    include,
    resolvers: [
      ...(antd ? [autoImportAntd] : []),
      IconsResolver({
        componentPrefix: iconOptions.iconPrefix,
        customCollections: [iconOptions.collectionName],
        extension: 'tsx',
        prefix: iconOptions.iconPrefix
      }),
      ...normalizeResolvers(resolvers)
    ]
  });
}

function autoImportAntd(componentName: string) {
  const pattern = /^A[A-Z]/;

  if (pattern.test(componentName)) {
    return { from: 'antd', name: componentName.slice(1) };
  }

  return null;
}

function normalizeResolvers(resolvers: AutoImportOptions['resolvers'] = []) {
  if (!Array.isArray(resolvers)) return [resolvers];

  return resolvers.flat();
}

function createAutoImportOptions(options: ResolvedSetupAdminAutoImportOptions): AutoImportOptions {
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => !ADMIN_AUTO_IMPORT_OPTION_KEYS.has(key))
  ) as AutoImportOptions;
}
