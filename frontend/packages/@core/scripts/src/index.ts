#!/usr/bin/env node
import { cac } from 'cac';
import { blue, lightGreen } from 'kolorist';

import { version } from '../package.json';

import {
  cleanup,
  createAdminTemplate,
  genChangelog,
  gitCommit,
  gitCommitVerify,
  release,
  syncAdminTemplate,
  updatePkg
} from './commands';
import { loadCliOptions } from './config';
import type { Lang } from './locales';

type Command = 'changelog' | 'cleanup' | 'git-commit' | 'git-commit-verify' | 'release' | 'update-pkg';

type CommandAction<A extends object> = (args?: A) => Promise<void> | void;

type CommandWithAction<A extends object = object> = Record<Command, { action: CommandAction<A>; desc: string }>;

interface CommandArg {
  /**
   * The glob pattern of dirs to cleanup
   *
   * If not set, it will use the default value
   *
   * Multiple values use "," to separate them
   */
  cleanupDir?: string;
  /** Execute additional command after bumping and before git commit. Defaults to 'pnpm sa changelog' */
  execute?: string;
  /**
   * Display lang of cli
   *
   * @default 'en-us'
   */
  lang?: Lang;
  /** Indicates whether to push the git commit and tag. Defaults to true */
  push?: boolean;
  /** Generate changelog by total tags */
  total?: boolean;
}

interface CreateAdminCommandArg {
  /** 应用描述，写入 .env 和 package.json。 */
  description?: string;
  /** 目标目录存在时先删除再生成。 */
  force?: boolean;
  /** 生成后执行 pnpm install。 */
  install?: boolean;
  /** 目标目录，默认 apps/<name>。 */
  target?: string;
  /** 应用标题，写入 .env。 */
  title?: string;
}

interface SyncAdminTemplateCommandArg {
  /** Check whether the generated template is up to date without writing files. */
  check?: boolean;
  /** Source admin app directory. Defaults to apps/admin. */
  source?: string;
  /** Target template directory. Defaults to packages/@core/scripts/templates/admin. */
  target?: string;
}

export async function setupCli() {
  const cliOptions = await loadCliOptions();

  const cli = cac(blue('skyroc-admin'));

  cli
    .version(lightGreen(version))
    .option(
      '-e, --execute [command]',
      "Execute additional command after bumping and before git commit. Defaults to 'npx soy changelog'"
    )
    .option('-p, --push', 'Indicates whether to push the git commit and tag')
    .option('-t, --total', 'Generate changelog by total tags')
    .option(
      '-c, --cleanupDir <dir>',
      'The glob pattern of dirs to cleanup, If not set, it will use the default value, Multiple values use "," to separate them'
    )
    .option('-l, --lang <lang>', 'display lang of cli', { default: 'en-us', type: [String] })
    .help();

  const commands: CommandWithAction<CommandArg> = {
    changelog: {
      action: async args => {
        await genChangelog(cliOptions.changelogOptions, args?.total);
      },
      desc: 'generate changelog'
    },
    cleanup: {
      action: async () => {
        await cleanup(cliOptions.cleanupDirs);
      },
      desc: 'delete dirs: node_modules, dist, etc.'
    },
    'git-commit': {
      action: async args => {
        await gitCommit(args?.lang);
      },
      desc: 'git commit, generate commit message which match Conventional Commits standard'
    },
    'git-commit-verify': {
      action: async () => {
        await gitCommitVerify();
      },
      desc: 'verify git commit message, make sure it match Conventional Commits standard'
    },
    release: {
      action: async args => {
        await release(args?.execute, args?.push);
      },
      desc: 'release: update version, generate changelog, commit code'
    },
    'update-pkg': {
      action: async () => {
        await updatePkg(cliOptions.ncuCommandArgs);
      },
      desc: 'update package.json dependencies versions'
    }
  };

  for (const [command, { action, desc }] of Object.entries(commands)) {
    cli.command(command, lightGreen(desc)).action(action);
  }

  cli
    .command('create-admin <name>', lightGreen('create a new Skyroc admin app from the built-in template'))
    .option('--target <dir>', 'target directory, defaults to apps/<name>')
    .option('--title <title>', 'app title written to VITE_APP_TITLE')
    .option('--description <description>', 'app description written to package.json and VITE_APP_DESC')
    .option('--force', 'overwrite target directory if it already exists')
    .option('--install', 'run pnpm install after generation')
    .action(async (name: string, args: CreateAdminCommandArg) => {
      await createAdminTemplate(name, args);
    });

  cli
    .command('sync-admin-template', lightGreen('sync the built-in admin template from apps/admin'))
    .option('--check', 'check whether the admin template is up to date without writing files')
    .option('--source <dir>', 'source admin app directory, defaults to apps/admin')
    .option('--target <dir>', 'target template directory, defaults to packages/@core/scripts/templates/admin')
    .action(async (args: SyncAdminTemplateCommandArg) => {
      await syncAdminTemplate(args);
    });

  cli.parse();
}

setupCli();
