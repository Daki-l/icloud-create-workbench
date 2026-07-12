import { baseCoverageConfig, baseTestConfig } from '@skyroc/config/vitest';
import { defineConfig } from 'vitest/config';

/**
 * @skyroc/color 测试配置
 *
 * 继承根目录的共享配置，保持配置一致性
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    coverage: baseCoverageConfig
  }
});
