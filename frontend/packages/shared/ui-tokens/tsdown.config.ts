import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: true,
  entry: [
    'src/index.ts',
    'src/colors.ts',
    'src/radius.ts',
    'src/spacing.ts',
    'src/typography.ts'
  ],
  minify: false,
  platform: 'neutral',
  sourcemap: false,
  unbundle: true
});
