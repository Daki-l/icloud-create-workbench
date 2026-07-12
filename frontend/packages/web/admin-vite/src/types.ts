import type { PluginOption } from 'vite';

export interface AdminViteIconOptions {
  /** Resolved local icon collection name. */
  collectionName?: string;

  /** CSS class prefix for icon presets. */
  iconPrefix?: string;

  /** File system directory for local svg icons. */
  localIconPath?: string;

  /** Local icon prefix used to derive the icon collection name and svg symbol id. */
  localIconPrefix?: string;

  /** Scale applied to generated icons. */
  scale?: number;

  /** Optional svg transformer before icons are registered. */
  transformSvg?: (svg: string) => string;
}

export interface AdminVitePluginAppendOptions {
  /** Plugins appended after the built-in admin preset plugins. */
  appendPlugins?: PluginOption[];

  /** Plugins inserted before the built-in admin preset plugins. */
  prependPlugins?: PluginOption[];
}

export type MaybePluginConfig<T> = false | T;
