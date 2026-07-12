import { defineConfig } from 'tsdown';

import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  clean: true,
  copy: [
    { flatten: false, from: 'src/libs/admin-layout/index.module.css', to: 'dist' },
    { flatten: false, from: 'src/libs/page-tab/index.module.css', to: 'dist' }
  ],
  dts: true,
  entry: ['src/index.ts'],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'react/jsx-runtime',
    /\.module\.css$/
  ],
  minify: false,
  platform: 'neutral',
  sourcemap: false,
  unbundle: true
});
