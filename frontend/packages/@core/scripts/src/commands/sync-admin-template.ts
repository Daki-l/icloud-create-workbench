// oxlint-disable no-console
// oxlint-disable no-continue
// oxlint-disable no-await-in-loop
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Generator, configSchema } from '@tanstack/router-generator';
import { cyan, green, red, yellow } from 'kolorist';

interface SyncAdminTemplateOptions {
  /** Check whether the template matches apps/admin without changing files. */
  check?: boolean;
  /** Source admin app directory. Defaults to apps/admin. */
  source?: string;
  /** Target template directory. Defaults to packages/@core/scripts/templates/admin. */
  target?: string;
}

type DifferenceType = 'added' | 'changed' | 'removed';

interface DirectoryDifference {
  path: string;
  type: DifferenceType;
}

const TEMPLATE_NAME = 'admin';

const TECHNICAL_DIRS = new Set(['.turbo', 'dist', 'node_modules']);

function getPackageRoot() {
  let currentDir = path.dirname(fileURLToPath(import.meta.url));

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (existsSync(packageJsonPath)) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error('Cannot resolve @skyroc/scripts package root.');
}

function getWorkspaceRoot(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);

  while (currentDir !== path.dirname(currentDir)) {
    const workspaceConfigPath = path.join(currentDir, 'pnpm-workspace.yaml');

    if (existsSync(workspaceConfigPath)) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error('Cannot resolve workspace root. Run this command inside the monorepo.');
}

function normalizeRelativePath(filePath: string) {
  return filePath.split(path.sep).join('/');
}

function isLocalEnvFile(relativePath: string) {
  const basename = path.posix.basename(relativePath);

  return basename === '.env.local' || /^\.env\..*\.local$/.test(basename);
}

function isTechnicalGeneratedPath(relativePath: string) {
  if (!relativePath) return false;

  const segments = relativePath.split('/');
  const basename = segments.at(-1);

  return (
    basename === '.DS_Store' ||
    basename?.endsWith('.tsbuildinfo') ||
    basename?.endsWith('.log') ||
    isLocalEnvFile(relativePath) ||
    segments.some(segment => TECHNICAL_DIRS.has(segment))
  );
}

function isRouteTreeFile(relativePath: string) {
  return relativePath === 'src/features/router/routeTree.gen.ts';
}

function shouldCopyPath(relativePath: string) {
  return !isTechnicalGeneratedPath(relativePath) && !isRouteTreeFile(relativePath);
}

function shouldComparePath(relativePath: string) {
  return !isTechnicalGeneratedPath(relativePath);
}

function resolveSourceDir(workspaceRoot: string, source?: string) {
  return path.resolve(workspaceRoot, source || 'apps/admin');
}

function resolveTargetDir(target?: string) {
  return path.resolve(process.cwd(), target || path.join(getPackageRoot(), 'templates', TEMPLATE_NAME));
}

async function copyAdminSource(sourceDir: string, targetDir: string) {
  await rm(targetDir, { force: true, recursive: true });

  await cp(sourceDir, targetDir, {
    filter: source => {
      const relativePath = normalizeRelativePath(path.relative(sourceDir, source));

      return shouldCopyPath(relativePath);
    },
    recursive: true
  });
}

async function generateRouteTree(targetDir: string) {
  const routeTreeTmpDir = await mkdtemp(path.join(tmpdir(), 'skyroc-route-tree-'));

  try {
    const config = configSchema.parse({
      autoCodeSplitting: true,
      disableLogging: true,
      generatedRouteTree: path.join(targetDir, 'src/features/router/routeTree.gen.ts'),
      routeFileIgnorePattern: '(?:^|/)(components|modules)(?:/|$)|(?:^|/)(loading|error|not-found)(?:.tsx?|$)',
      routesDirectory: path.join(targetDir, 'src/pages'),
      routeToken: 'layout',
      target: 'react',
      tmpDir: routeTreeTmpDir
    });

    await new Generator({ config, root: targetDir }).run();
  } finally {
    await rm(routeTreeTmpDir, { force: true, recursive: true });
  }
}

async function collectFiles(dir: string) {
  const files: string[] = [];

  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(path.relative(dir, fullPath));

      if (!shouldComparePath(relativePath)) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  if (existsSync(dir)) {
    await walk(dir);
  }

  return files.toSorted((a, b) => a.localeCompare(b));
}

async function compareFiles(leftFile: string, rightFile: string) {
  const [leftStat, rightStat] = await Promise.all([stat(leftFile), stat(rightFile)]);

  if (leftStat.size !== rightStat.size) return false;

  const [leftContent, rightContent] = await Promise.all([readFile(leftFile), readFile(rightFile)]);

  return leftContent.equals(rightContent);
}

async function compareDirectories(leftDir: string, rightDir: string) {
  const [leftFiles, rightFiles] = await Promise.all([collectFiles(leftDir), collectFiles(rightDir)]);
  const allFiles = Array.from(new Set([...leftFiles, ...rightFiles])).toSorted((a, b) => a.localeCompare(b));
  const differences: DirectoryDifference[] = [];

  for (const file of allFiles) {
    const leftHasFile = leftFiles.includes(file);
    const rightHasFile = rightFiles.includes(file);

    if (!leftHasFile) {
      differences.push({ path: file, type: 'added' });
      continue;
    }

    if (!rightHasFile) {
      differences.push({ path: file, type: 'removed' });
      continue;
    }

    const isSame = await compareFiles(path.join(leftDir, file), path.join(rightDir, file));

    if (!isSame) {
      differences.push({ path: file, type: 'changed' });
    }
  }

  return differences;
}

async function generateSnapshot(sourceDir: string, targetDir: string) {
  if (!existsSync(sourceDir)) {
    throw new Error(`Admin source is missing: ${sourceDir}`);
  }

  await copyAdminSource(sourceDir, targetDir);
  await generateRouteTree(targetDir);
}

function formatDifferences(differences: DirectoryDifference[]) {
  return differences
    .slice(0, 20)
    .map(item => `  ${item.type.padEnd(7)} ${item.path}`)
    .join('\n');
}

async function checkAdminTemplate(sourceDir: string, targetDir: string) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'skyroc-admin-template-'));
  const generatedDir = path.join(tempDir, TEMPLATE_NAME);

  try {
    await generateSnapshot(sourceDir, generatedDir);

    const differences = await compareDirectories(targetDir, generatedDir);

    if (differences.length > 0) {
      const detail = formatDifferences(differences);
      const suffix = differences.length > 20 ? `\n  ...and ${differences.length - 20} more` : '';

      throw new Error(
        [
          red('Admin template is out of date.'),
          `${cyan('source')} ${sourceDir}`,
          `${cyan('target')} ${targetDir}`,
          yellow('Run pnpm sa sync-admin-template to regenerate it.'),
          detail,
          suffix
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    console.log(green('Admin template is up to date.'));
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

export async function syncAdminTemplate(options: SyncAdminTemplateOptions = {}) {
  const workspaceRoot = getWorkspaceRoot();
  const sourceDir = resolveSourceDir(workspaceRoot, options.source);
  const targetDir = resolveTargetDir(options.target);

  if (options.check) {
    await checkAdminTemplate(sourceDir, targetDir);
    return;
  }

  await generateSnapshot(sourceDir, targetDir);

  console.log(green('Synced admin template.'));
  console.log(`${cyan('source')} ${sourceDir}`);
  console.log(`${cyan('target')} ${targetDir}`);
}
