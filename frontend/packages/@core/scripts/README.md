# @skyroc/scripts

Skyroc Admin CLI 工具集 — 通过统一入口 `sa` 命令，封装 changelog 生成、版本发布、规范化 Git 提交、依赖更新、清理构建产物等项目自动化脚本。

## 解决什么问题

```
❌ 每次发版：手动改版本号 → 手动写 CHANGELOG → 手动打 tag → 手动 push
❌ git commit：在脑中查规范 → 手写类型/范围 → 不确定格式对不对
❌ 项目清理：一个个目录找 node_modules / dist → 逐一删除
❌ 依赖更新：不知道哪些包有新版本 → 逐一核对
```

`@skyroc/scripts` 的答案：**一条命令 + 交互式引导 + 配置文件驱动**。

## 安装

```bash
# 在 monorepo 根目录已通过 workspace 引用，无需额外安装
# 若需独立使用：
pnpm add -D @skyroc/scripts
```

## 快速上手

```bash
# 查看帮助与所有可用命令
pnpm sa --help

# 查看版本
pnpm sa --version
```

典型工作流：

```bash
# 日常提交
pnpm sa git-commit

# 发版
pnpm sa release

# 清理构建产物
pnpm sa cleanup

# 生成新的 admin app
pnpm sa create-admin my-admin

# 从 apps/admin 同步内置 admin 模板
pnpm sa sync-admin-template
```

## 命令一览

| 命令 | 说明 |
| --- | --- |
| `sa changelog` | 生成 / 更新 CHANGELOG.md |
| `sa cleanup` | 删除 dist、node_modules 等构建产物 |
| `sa create-admin <name>` | 基于内置模板生成新的 admin app |
| `sa git-commit` | 交互式生成符合 Conventional Commits 规范的提交信息 |
| `sa git-commit-verify` | 校验当前 git 提交信息是否符合规范（用于 git hook） |
| `sa release` | 版本发布：升级版本号 → 生成 changelog → commit + tag + push |
| `sa sync-admin-template` | 从 `apps/admin` 生成内置 admin 模板 |
| `sa update-pkg` | 检测并升级 package.json 中的依赖版本 |

## 全局选项

所有命令共享以下选项：

| 选项 | 简写 | 说明 | 默认值 |
| --- | --- | --- | --- |
| `--lang <lang>` | `-l` | CLI 交互语言，支持 `en-us` / `zh-cn` | `en-us` |
| `--execute <cmd>` | `-e` | release 版本号升级后、git commit 前执行的额外命令 | `pnpm sa changelog` |
| `--push` | `-p` | release 完成后是否自动 push | `true` |
| `--total` | `-t` | changelog 命令：基于所有历史 tag 生成完整 changelog | `false` |
| `--cleanupDir <dir>` | `-c` | cleanup 命令：自定义清理目录的 glob 匹配模式，多个用 `,` 分隔 | 见配置默认值 |

## 命令详情

### `sa create-admin`

基于内置 admin 模板生成一个新的 Vite + React admin app。默认输出到 `apps/<name>`，并自动写入 `package.json`、`.env` 中的应用名称、描述和 storage prefix。模板只保留最小登录、错误兜底和一个 Home 页面，业务页面由新项目自己添加。

```bash
# 生成 apps/my-admin
pnpm sa create-admin my-admin

# 指定目录
pnpm sa create-admin my-admin --target apps/admin-template

# 覆盖已存在目录
pnpm sa create-admin my-admin --force

# 自定义应用标题和描述
pnpm sa create-admin my-admin --title "My Admin" --description "Internal admin console"
```

生成后如果这是新的 workspace package，需要执行一次：

```bash
pnpm install
```

也可以让命令生成后立即安装：

```bash
pnpm sa create-admin my-admin --install
```

### `sa sync-admin-template`

从 `apps/admin` 生成 `packages/@core/scripts/templates/admin`。`apps/admin` 是唯一源码，模板目录是发布快照，不手工维护。

同步时会跳过 `node_modules`、`dist`、`.turbo`、`.DS_Store`、本地 `.env.*.local` 和 `src/features/router/routeTree.gen.ts`，再根据模板自身的 `src/pages` 重新生成 `routeTree.gen.ts`。

```bash
# 同步模板
pnpm sa sync-admin-template

# 只检查模板是否落后，适合 CI
pnpm sa sync-admin-template --check
```

### `sa git-commit`

交互式引导完成一次符合 [Conventional Commits](https://conventionalcommits.org) 规范的 git 提交。

**交互流程：**

1. 选择提交类型（type）
2. 选择提交范围（scope）
3. 输入描述（description）
   - 描述以 `!` 开头时，自动标记为破坏性变更（`breaking change`）

**生成格式：**

```
<type>(<scope>): <description>
# 例：feat(components): add new Button component
# 破坏性变更：feat(api)!: remove deprecated endpoints
```

**支持的提交类型：**

| 类型 | 说明 |
| --- | --- |
| `feat` | 新功能 |
| `feat-wip` | 开发中的功能（partial commit） |
| `fix` | Bug 修复 |
| `docs` | 仅文档变更 |
| `typo` | 代码或文档中的拼写/笔误修正 |
| `style` | 不影响代码含义的格式调整 |
| `refactor` | 既不修复 bug 也不添加功能的代码重构 |
| `perf` | 性能优化 |
| `optimize` | 代码质量优化 |
| `test` | 测试相关 |
| `build` | 构建系统或外部依赖变更 |
| `ci` | CI 配置变更 |
| `chore` | 其他杂项变更 |
| `revert` | 回退先前提交 |

**支持的提交范围：**

| 范围 | 说明 |
| --- | --- |
| `projects` | 整体项目 |
| `packages` | 子包 |
| `components` | 组件 |
| `hooks` | Hook 函数 |
| `utils` | 工具函数 |
| `types` | TypeScript 类型声明 |
| `styles` | 样式 |
| `deps` | 项目依赖 |
| `release` | 版本发布 |
| `other` | 其他 |

---

### `sa git-commit-verify`

读取 `.git/COMMIT_EDITMSG` 中的提交信息，校验其是否符合 Conventional Commits 正则：

```
<type>(<scope>)?(!)?:  <description>
```

不符合则抛出错误并终止提交。

**在 git hook 中使用：**

```bash
# .husky/commit-msg
pnpm sa git-commit-verify
```

以下格式的提交信息会被自动放行（不校验）：

- Merge Pull Request
- Merge branch / tag / remote-tracking branch
- Revert 提交
- amend / fixup / squash 操作
- 自动合并提交

---

### `sa changelog`

基于 git tag 差异，调用 `@soybeanjs/changelog` 生成或追加 `CHANGELOG.md`。

```bash
# 生成最新 tag 以来的变更
pnpm sa changelog

# 基于所有历史 tag 重新生成完整 changelog
pnpm sa changelog --total
```

---

### `sa release`

一键完成完整发版流程：

```
1. 交互式选择新版本号（bumpp）
2. 更新所有 package.json 中的 version 字段（包含子包，排除 node_modules）
3. 执行 --execute 指定的命令（默认：pnpm sa changelog）
4. 创建 git commit：chore(projects): release v<version>
5. 打 git tag：v<version>
6. push commit + tag（可通过 --push false 跳过）
```

```bash
# 标准发版（自动 push）
pnpm sa release

# 发版但不 push（本地验证后手动 push）
pnpm sa release --push false

# 发版后执行自定义命令（替换默认的 changelog 生成）
pnpm sa release --execute "pnpm build && pnpm sa changelog"
```

---

### `sa cleanup`

批量删除项目中匹配 glob 模式的目录或文件，适合在切换分支或提交 PR 前彻底清理构建产物。

```bash
# 使用默认清理规则
pnpm sa cleanup

# 仅清理指定目录（覆盖默认规则）
pnpm sa cleanup --cleanupDir "**/dist,**/node_modules"
```

**默认清理规则：**

```
**/dist
**/package-lock.json
**/yarn.lock
**/pnpm-lock.yaml
**/node_modules
!node_modules/**     ← 排除根目录 node_modules 内层
```

---

### `sa update-pkg`

调用 `npm-check-updates` 检测并升级 `package.json` 依赖版本。

```bash
# 使用默认参数（--deep -u，递归更新所有子包并写入 package.json）
pnpm sa update-pkg
```

更新完成后需重新执行 `pnpm install` 使变更生效：

```bash
pnpm sa update-pkg && pnpm install
```

## 配置

`@skyroc/scripts` 通过 [c12](https://github.com/unjs/c12) 加载配置，支持以下配置文件（位于项目根目录）：

```
soybean.config.ts
soybean.config.js
soybean.config.mjs
package.json 中的 "soybean" 字段
```

### 配置项

```ts
interface CliOption {
  /**
   * 项目根目录
   * @default process.cwd()
   */
  cwd: string;

  /**
   * cleanup 命令的清理目录 glob 模式列表
   * 语法参考：https://github.com/isaacs/minimatch
   * @default ["**/dist", "**/pnpm-lock.yaml", "**/node_modules", "!node_modules/**"]
   */
  cleanupDirs: string[];

  /**
   * update-pkg 命令传给 npm-check-updates 的参数
   * @default ['--deep', '-u']
   */
  ncuCommandArgs: string[];

  /**
   * changelog 命令的配置项
   * 参考：https://github.com/soybeanjs/changelog
   */
  changelogOptions: Partial<ChangelogOption>;

  /**
   * git-commit-verify 放行的提交信息正则列表
   * 匹配任意一项则跳过校验
   */
  gitCommitVerifyIgnores: RegExp[];
}
```

### 配置示例

```ts
// soybean.config.ts
import { defineConfig } from '@skyroc/scripts';

export default defineConfig({
  cleanupDirs: [
    '**/dist',
    '**/node_modules',
    '!node_modules/**'
  ],
  ncuCommandArgs: ['--deep', '-u', '--reject', 'react'],
  changelogOptions: {
    // 参考 @soybeanjs/changelog 文档
  },
  gitCommitVerifyIgnores: [
    /^WIP:/
  ]
});
```

## 在 Git Hooks 中集成

推荐搭配 [husky](https://github.com/typicode/husky) 使用：

```bash
# .husky/commit-msg
pnpm sa git-commit-verify
```

```json
// package.json
{
  "scripts": {
    "commit": "sa git-commit",
    "prepare": "husky install"
  }
}
```

## 语言支持

`--lang` 选项控制交互界面语言，目前支持：

| 值 | 说明 |
| --- | --- |
| `en-us` | 英文（默认） |
| `zh-cn` | 简体中文 |

```bash
pnpm sa git-commit --lang zh-cn
```

## 架构

```
packages/@core/scripts/
├── bin.ts                    # CLI 入口（开发时通过 tsx 执行）
├── src/
│   ├── index.ts              # setupCli()：注册所有命令，解析 argv
│   ├── commands/
│   │   ├── changelog.ts      # genChangelog()
│   │   ├── cleanup.ts        # cleanup()
│   │   ├── create-admin.ts   # createAdminTemplate()
│   │   ├── git-commit.ts     # gitCommit() / gitCommitVerify()
│   │   ├── release.ts        # release()
│   │   ├── sync-admin-template.ts # syncAdminTemplate()
│   │   └── update-pkg.ts     # updatePkg()
│   ├── config/
│   │   └── index.ts          # loadCliOptions()：c12 加载配置 + 默认值合并
│   ├── locales/
│   │   └── index.ts          # 多语言文本（en-us / zh-cn）
│   ├── shared/
│   │   └── index.ts          # execCommand()：execa 封装
│   └── types/
│       └── index.ts          # CliOption 类型定义
├── templates/
│   └── admin/                # admin app 模板
└── dist/
    └── index.mjs             # 构建产物（发布时使用）
```

**依赖说明：**

| 依赖 | 用途 |
| --- | --- |
| `cac` | CLI 框架，命令/选项注册与解析 |
| `bumpp` | 交互式版本号升级 |
| `@soybeanjs/changelog` | Changelog 生成 |
| `enquirer` | 终端交互式 prompt |
| `c12` | 配置文件加载（支持多种格式） |
| `execa` | 跨平台子进程执行 |
| `npm-check-updates` | 依赖版本检测与更新 |
| `kolorist` | 终端颜色输出 |
| `picomatch` | Glob 模式匹配 |

## 设计原则

- **零侵入** — 配置文件可选，合理的默认值覆盖大多数场景
- **交互式优先** — 复杂操作（发版、提交）引导式完成，不靠记忆
- **可扩展** — 通过 `soybean.config.ts` 覆盖任意默认行为
- **跨平台** — execa + rimraf，Windows / macOS / Linux 均可使用
