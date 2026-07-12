import { COVERAGE_EXCLUDE, baseCoverageConfig, baseTestConfig } from '@skyroc/config/vitest';
import { defineConfig } from 'vitest/config';

/**
 * @skyroc/axios 测试配置
 *
 * 使用 node 环境，确保 msw 对 axios HTTP 请求的拦截可靠工作。
 * 覆盖率排除列表移除 index.ts，因为本包的 index.ts 包含核心实现而非纯 barrel 导出。
 */
export default defineConfig({
  test: {
    ...baseTestConfig,
    environment: 'node',
    coverage: {
      ...baseCoverageConfig,
      exclude: [...COVERAGE_EXCLUDE.filter(p => p !== '**/index.ts'), '**/type.ts']
    }
  }
});
