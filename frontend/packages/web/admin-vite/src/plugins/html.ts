import type { Plugin } from 'vite';

export interface SetupAdminHtmlPluginOptions {
  /** Meta tag content for build time. */
  buildTime: string;

  /** Meta tag name injected into index.html. */
  metaName?: string;
}

export function setupAdminHtmlPlugin(options: SetupAdminHtmlPluginOptions): Plugin {
  const { buildTime, metaName = 'buildTime' } = options;

  return {
    apply: 'build',
    name: 'skyroc:admin-html',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta name="${metaName}" content="${buildTime}">`);
    }
  };
}
