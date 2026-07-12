import { tanstackRouter } from '@tanstack/router-plugin/vite';

type TanStackRouterOptions = NonNullable<Parameters<typeof tanstackRouter>[0]>;

export interface SetupAdminRouterPluginOptions extends Partial<TanStackRouterOptions> {}

export function setupAdminRouterPlugins(options: SetupAdminRouterPluginOptions = {}) {
  return [
    tanstackRouter({
      autoCodeSplitting: true,
      generatedRouteTree: './src/features/router/routeTree.gen.ts',
      routeFileIgnorePattern: '(?:^|/)(components|modules)(?:/|$)|(?:^|/)(loading|error|not-found)(?:.tsx?|$)',
      routesDirectory: './src/pages',
      routeToken: 'layout',
      target: 'react',
      ...options
    })
  ];
}
