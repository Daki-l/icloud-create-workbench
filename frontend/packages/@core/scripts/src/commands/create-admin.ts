import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { cyan, green, yellow } from 'kolorist';

interface CreateAdminTemplateOptions {
  /** 应用描述，写入 .env 和 package.json。 */
  description?: string;
  /** 目标目录存在时先删除再生成。 */
  force?: boolean;
  /** 安装完成后是否执行 pnpm install。 */
  install?: boolean;
  /** 目标目录，默认 apps/<name>。 */
  target?: string;
  /** 应用标题，写入 .env。 */
  title?: string;
}

interface PackageJson {
  description?: string;
  name?: string;
  [key: string]: unknown;
}

interface EnvFileUpdate {
  /** 应用描述，写入 VITE_APP_DESC。 */
  description: string;
  /** 本地存储键名前缀，写入 VITE_STORAGE_PREFIX。 */
  storagePrefix: string;
  /** 环境文件所在的目标应用目录。 */
  targetDir: string;
  /** 应用标题，写入 VITE_APP_TITLE。 */
  title: string;
}

const TEMPLATE_NAME = 'admin';

function normalizePackageName(name: string) {
  const normalizedName = name
    .trim()
    .replaceAll('_', '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-@/]/g, '')
    .toLowerCase();

  if (!normalizedName) {
    throw new Error('Admin app name is required.');
  }

  if (!/^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(normalizedName)) {
    throw new Error(`Invalid package name: ${name}`);
  }

  return normalizedName;
}

function toTitle(name: string) {
  return name
    .replace(/^@[^/]+\//, '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(item => `${item.charAt(0).toUpperCase()}${item.slice(1)}`)
    .join(' ');
}

function toStoragePrefix(name: string) {
  const prefix = name
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

  return `${prefix || 'ADMIN'}_`;
}

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

function getTemplateDir() {
  return path.join(getPackageRoot(), 'templates', TEMPLATE_NAME);
}

async function isDirectoryEmpty(dir: string) {
  if (!existsSync(dir)) return true;

  const files = await readdir(dir);

  return files.length === 0;
}

function replaceEnvValue(content: string, key: string, value: string) {
  const escapedValue = value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const regexp = new RegExp(`^${key}=.*$`, 'm');

  if (!regexp.test(content)) {
    return `${content.trimEnd()}\n${key}=${escapedValue}\n`;
  }

  return content.replace(regexp, `${key}=${escapedValue}`);
}

async function updatePackageJson(targetDir: string, packageName: string, description: string) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageJson;

  packageJson.name = packageName;
  packageJson.description = description;

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function updateEnvFile(options: EnvFileUpdate) {
  const { description, storagePrefix, targetDir, title } = options;
  const envPath = path.join(targetDir, '.env');
  let env = await readFile(envPath, 'utf8');

  env = replaceEnvValue(env, 'VITE_APP_TITLE', title);
  env = replaceEnvValue(env, 'VITE_APP_DESC', description);
  env = replaceEnvValue(env, 'VITE_STORAGE_PREFIX', storagePrefix);

  await writeFile(envPath, env);
}

async function installDependencies() {
  const { execa } = await import('execa');
  await execa('pnpm', ['install'], {
    cwd: process.cwd(),
    stdio: 'inherit'
  });
}

export async function createAdminTemplate(name: string, options: CreateAdminTemplateOptions = {}) {
  const packageName = normalizePackageName(name);
  const title = options.title || toTitle(packageName);
  const description = options.description || `${title} admin application`;
  const storagePrefix = toStoragePrefix(packageName);
  const targetDir = path.resolve(process.cwd(), options.target || path.join('apps', packageName.replace(/^@[^/]+\//, '')));
  const templateDir = getTemplateDir();

  if (!existsSync(templateDir)) {
    throw new Error(`Admin template is missing: ${templateDir}`);
  }

  if (existsSync(targetDir) && !(await isDirectoryEmpty(targetDir))) {
    if (!options.force) {
      throw new Error(`Target directory is not empty: ${targetDir}. Use --force to overwrite it.`);
    }

    await rm(targetDir, { force: true, recursive: true });
  }

  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(templateDir, targetDir, { recursive: true });
  await updatePackageJson(targetDir, packageName, description);
  await updateEnvFile({
    description,
    storagePrefix,
    targetDir,
    title
  });

  if (options.install) {
    await installDependencies();
  }

  console.log(green(`Created admin app: ${packageName}`));
  console.log(`${cyan('target')} ${targetDir}`);
  console.log(`${cyan('dev')}    pnpm --dir ${targetDir} dev`);

  if (!options.install) {
    console.log(yellow('Run pnpm install before starting the new app if this is a new workspace package.'));
  }

  console.log(yellow('The template starts with a minimal Home page; add product routes under src/pages/(admin).'));
}
