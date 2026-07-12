import react from '@vitejs/plugin-react';

export type SetupAdminReactPluginOptions = NonNullable<Parameters<typeof react>[0]>;

export function setupAdminReactPlugin(options: SetupAdminReactPluginOptions = {}) {
  return react(options);
}
