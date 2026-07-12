import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders';
import { presetIcons } from '@unocss/preset-icons';
import unocss from '@unocss/vite';

import type { AdminViteIconOptions } from '../types';
import { resolveAdminIconOptions } from './icon-utils';

export interface SetupAdminUnocssOptions extends AdminViteIconOptions {
  /** Extra CSS properties assigned to generated icon classes. */
  extraProperties?: Record<string, string>;

  /** Whether missing icons should warn in terminal. */
  warn?: boolean;
}

export type ResolvedSetupAdminUnocssOptions = SetupAdminUnocssOptions;

export function setupAdminUnocss(options: ResolvedSetupAdminUnocssOptions = {}) {
  const { extraProperties = { display: 'inline-block' }, warn = true } = options;
  const iconOptions = resolveAdminIconOptions(options);

  return unocss({
    presets: [
      presetIcons({
        collections: {
          [iconOptions.collectionName]: FileSystemIconLoader(iconOptions.localIconPath, iconOptions.transformSvg)
        },
        extraProperties,
        prefix: `${iconOptions.iconPrefix}-`,
        scale: iconOptions.scale,
        warn
      })
    ]
  });
}
