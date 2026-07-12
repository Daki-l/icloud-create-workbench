import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts'],
  minify: false,
  platform: 'neutral',
  sourcemap: false,
  unbundle: false
});
