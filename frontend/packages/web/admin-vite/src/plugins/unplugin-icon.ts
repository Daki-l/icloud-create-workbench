import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import type { PluginOption } from 'vite';
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';

import type { AdminViteIconOptions } from '../types';
import { resolveAdminIconOptions } from './icon-utils';

export interface SetupAdminUnpluginIconOptions extends AdminViteIconOptions {
  /** DOM id used by vite-plugin-svg-icons. */
  customDomId?: string;

  /** Default class for generated icon components. */
  defaultClass?: string;

  /** Where the svg sprite is injected. */
  inject?: 'body-first' | 'body-last';
}

export type ResolvedSetupAdminUnpluginIconOptions = SetupAdminUnpluginIconOptions;

export function setupAdminUnpluginIcon(options: ResolvedSetupAdminUnpluginIconOptions = {}): PluginOption[] {
  const { customDomId = '__SVG_ICON_LOCAL__', defaultClass = 'inline-block', inject = 'body-last' } = options;
  const iconOptions = resolveAdminIconOptions(options);

  return [
    createSvgIconsPlugin({
      customDomId,
      iconDirs: [iconOptions.localIconPath],
      inject,
      symbolId: `${iconOptions.localIconPrefix}-[dir]-[name]`
    }),
    Icons({
      compiler: 'jsx',
      customCollections: {
        [iconOptions.collectionName]: FileSystemIconLoader(iconOptions.localIconPath, iconOptions.transformSvg)
      },
      defaultClass,
      jsx: 'react',
      scale: iconOptions.scale
    })
  ];
}
