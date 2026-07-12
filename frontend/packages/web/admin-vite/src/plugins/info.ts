import process from 'node:process';

import boxen, { type Options as BoxenOptions } from 'boxen';
import gradientString from 'gradient-string';
import type { Plugin } from 'vite';

type BoxenBorderStyle = NonNullable<BoxenOptions['borderStyle']>;
type ProjectInfoBorderStyle =
  | Exclude<BoxenBorderStyle, object>
  | Omit<Extract<BoxenBorderStyle, object>, 'horizontal' | 'vertical'>;

export type SetupAdminProjectInfoBoxenOptions = Omit<BoxenOptions, 'align' | 'borderStyle'> & {
  /** Border style without boxen's deprecated custom border aliases. */
  borderStyle?: ProjectInfoBorderStyle;
};

export interface SetupAdminProjectInfoOptions {
  /** Boxen options used to render the terminal message. */
  boxenOptions?: SetupAdminProjectInfoBoxenOptions;

  /** Gradient colors passed to gradient-string. */
  colors?: [string, string, ...string[]];

  /** Whether the message is printed. */
  enabled?: boolean;

  /** Text printed when Vite starts. */
  message?: string;
}

const DEFAULT_MESSAGE = `您好! 欢迎使用 skyroc-admin 开源项目\n我们为您精心准备了精美的保姆级文档\nhttps://admin-docs.skyroc.me/`;

const DEFAULT_BOXEN_OPTIONS: SetupAdminProjectInfoBoxenOptions = {
  borderColor: '#646cff',
  borderStyle: 'round',
  padding: 0.5
};

export function setupAdminProjectInfo(options: SetupAdminProjectInfoOptions = {}): Plugin {
  const {
    boxenOptions = DEFAULT_BOXEN_OPTIONS,
    colors = ['#646cff', 'magenta'],
    enabled = true,
    message = DEFAULT_MESSAGE
  } = options;
  const resolvedBoxenOptions: SetupAdminProjectInfoBoxenOptions = {
    ...DEFAULT_BOXEN_OPTIONS,
    ...boxenOptions
  };

  return {
    buildStart() {
      if (!enabled) return;

      process.stdout.write(`${createProjectInfoMessage(message, colors, resolvedBoxenOptions)}\n`);
    },
    name: 'skyroc:admin-project-info'
  };
}

function createProjectInfoMessage(
  message: string,
  colors: [string, string, ...string[]],
  boxenOptions: SetupAdminProjectInfoBoxenOptions
) {
  return boxen(gradientString(...colors).multiline(message), boxenOptions);
}
