import type { BuildOptions } from 'vite';

export interface CreateAdminBuildOptionsOptions {
  /** Component source path marker used to place component chunks. */
  componentsDirPattern?: string;

  /** Image extensions grouped under images/. */
  imageExtensions?: string[];

  /** Extra Rollup manual chunks merged with the admin defaults. */
  manualChunks?: Record<string, string[]>;

  /** Page source path marker used to place page chunks. */
  pagesDirPattern?: string;
}

const DEFAULT_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];

const DEFAULT_MANUAL_CHUNKS: Record<string, string[]> = {
  antd: ['antd'],
  il8n: ['react-i18next', 'i18next'],
  react: ['react', 'react-dom'],
  'react-router': ['@tanstack/react-router']
};

export function createAdminBuildOptions(options: CreateAdminBuildOptionsOptions = {}): BuildOptions {
  const {
    componentsDirPattern = '/src/components/',
    imageExtensions = DEFAULT_IMAGE_EXTENSIONS,
    manualChunks,
    pagesDirPattern = '/src/pages/'
  } = options;

  return {
    rollupOptions: {
      output: {
        assetFileNames: chunkInfo => {
          const name = chunkInfo.names[0];

          if (name?.endsWith('.css')) {
            return 'css/[name]-[hash].css';
          }

          if (imageExtensions.some(ext => name?.endsWith(`.${ext}`))) {
            return 'images/[name]-[hash].[ext]';
          }

          if (name?.endsWith('.js')) {
            return 'js/[name]-[hash].js';
          }

          return 'assets/[name]-[hash].[ext]';
        },
        chunkFileNames: chunkInfo => {
          const filePath = chunkInfo.facadeModuleId;

          if (filePath?.includes(pagesDirPattern)) {
            const pageName = filePath.split(pagesDirPattern)[1];
            const normalizedPageName = pageName?.replace(/\[([^\]]+)\]/g, '$1') || '';
            const path = normalizedPageName.slice(0, normalizedPageName.lastIndexOf('/'));

            return `js/pages/${path}/[name]-[hash].js`;
          }

          if (filePath?.includes(componentsDirPattern)) {
            return 'js/components/[name]-[hash].js';
          }

          return 'js/[name]-[hash].js';
        },
        manualChunks: createManualChunks(manualChunks)
      }
    }
  };
}

function createManualChunks(manualChunks: Record<string, string[]> = {}) {
  const chunkGroups = {
    ...DEFAULT_MANUAL_CHUNKS,
    ...manualChunks
  };

  return (moduleId: string) => {
    const normalizedModuleId = moduleId.replaceAll('\\', '/');

    for (const [chunkName, packages] of Object.entries(chunkGroups)) {
      if (packages.some(packageName => isPackageModule(normalizedModuleId, packageName))) {
        return chunkName;
      }
    }

    return undefined;
  };
}

function isPackageModule(moduleId: string, packageName: string) {
  return moduleId.includes(`/node_modules/${packageName.replaceAll('\\', '/')}/`);
}

export function createAdminScssPreprocessorOptions(additionalData: string) {
  return {
    scss: {
      additionalData,
      api: 'modern-compiler' as const
    }
  };
}
