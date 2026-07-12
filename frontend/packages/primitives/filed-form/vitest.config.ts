import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COVERAGE_EXCLUDE, baseCoverageConfig, baseTestConfig } from '@skyroc/config/vitest';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * @skyroc/form 测试配置
 *
 * 继承仓库共享 Vitest 配置，覆盖 core 和 React 集成测试。
 */
export default defineConfig({
  resolve: {
    alias: {
      react: resolve(workspaceRoot, 'node_modules/react'),
      'react-dom': resolve(workspaceRoot, 'node_modules/react-dom'),
      'react-dom/client': resolve(workspaceRoot, 'node_modules/react-dom/client.js'),
      'react/jsx-dev-runtime': resolve(workspaceRoot, 'node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': resolve(workspaceRoot, 'node_modules/react/jsx-runtime.js')
    }
  },
  test: {
    ...baseTestConfig,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      ...baseCoverageConfig,
      exclude: [...COVERAGE_EXCLUDE, '**/react/index.ts', '**/types.ts']
    }
  }
});
