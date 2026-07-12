import path from 'node:path';
import process from 'node:process';

import type { AdminViteIconOptions } from '../types';

export type ResolveAdminIconOptions = AdminViteIconOptions;

export interface ResolvedAdminViteIconOptions {
  /** Resolved local icon collection name. */
  collectionName: string;

  /** CSS class prefix for icon presets. */
  iconPrefix: string;

  /** File system directory for local svg icons. */
  localIconPath: string;

  /** Local icon prefix used to derive the icon collection name and svg symbol id. */
  localIconPrefix: string;

  /** Scale applied to generated icons. */
  scale: number;

  /** Svg transformer before icons are registered. */
  transformSvg: (svg: string) => string;
}

export function resolveAdminIconOptions(options: ResolveAdminIconOptions): ResolvedAdminViteIconOptions {
  const iconPrefix = options.iconPrefix ?? 'icon';
  const localIconPrefix = options.localIconPrefix ?? `${iconPrefix}-local`;

  return {
    collectionName: options.collectionName ?? localIconPrefix.replace(`${iconPrefix}-`, ''),
    iconPrefix,
    localIconPath: options.localIconPath ?? path.join(process.cwd(), 'src/assets/svg-icon'),
    localIconPrefix,
    scale: options.scale ?? 1,
    transformSvg: options.transformSvg ?? (svg => svg.replace(/^<svg\s/, '<svg width="1em" height="1em" '))
  };
}
