import { baseCoverageConfig, baseTestConfig } from '@skyroc/config/vitest';
import { defineConfig } from 'vitest/config';

/**
 * @skyroc/hooks 测试配置
 *
 * 继承根目录的共享配置，保持配置一致性
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    setupFiles: ['./vitest.setup.ts'],
    coverage: baseCoverageConfig
  }
});
