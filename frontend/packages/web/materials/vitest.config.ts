import { COVERAGE_EXCLUDE, baseCoverageConfig, baseTestConfig } from '@skyroc/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    ...baseTestConfig,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      ...baseCoverageConfig,
      exclude: [...COVERAGE_EXCLUDE, '**/types/**', '**/*.module.css.d.ts']
    }
  }
});
