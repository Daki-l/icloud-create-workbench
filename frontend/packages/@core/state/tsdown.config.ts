import { defineConfig } from 'tsdown';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  external: [...Object.keys(pkg.peerDependencies || {})],
  minify: false,
  platform: 'neutral',
  sourcemap: false,
  unbundle: false
});
