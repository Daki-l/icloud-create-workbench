import { defineConfig } from 'tsdown';

import pkg from './package.json' with { type: 'json' };

const dependencies = (pkg as { dependencies?: Record<string, string> }).dependencies ?? {};
const peerDependencies = (pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {};

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/mock.ts'],
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies), 'react/jsx-runtime'],
  minify: false,
  platform: 'neutral',
  sourcemap: false,
  unbundle: true
});
