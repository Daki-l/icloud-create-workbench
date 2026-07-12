import { defineConfig } from 'tsdown';

import pkg from './package.json' with { type: 'json' };

const dependencies = (pkg as { dependencies?: Record<string, string> }).dependencies ?? {};

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts'],
  external: Object.keys(dependencies),
  minify: false,
  platform: 'node',
  shims: true,
  sourcemap: false,
  unbundle: false
});
