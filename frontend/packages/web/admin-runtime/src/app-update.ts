const DEFAULT_UPDATE_CHECK_INTERVAL = 3 * 60 * 1000;

interface GetHtmlBuildTimeOptions {
  /** HTML entry base URL, usually Vite's base URL. */
  baseUrl?: string;

  /** Fetch implementation used to read the current index.html. */
  fetcher?: typeof fetch;
}

export interface AppUpdateAvailableContext {
  /** Build time bundled in the running application. */
  currentBuildTime: string;

  /** Build time read from the latest index.html. */
  latestBuildTime: string;

  /** Allows the next update check after the host notification closes. */
  markPromptClosed: () => void;
}

export interface SetupAppVersionNotificationOptions {
  /** HTML entry base URL, usually Vite's base URL. */
  baseUrl?: string;

  /** Build time bundled in the running application. */
  currentBuildTime: string;

  /** Whether update checks should be started. */
  enabled: boolean;

  /** Check interval in milliseconds. */
  interval?: number;

  /** Receives fetch errors from update checking. */
  onError?: (error: unknown) => void;

  /** Called when a newer build is detected. */
  onUpdateAvailable: (context: AppUpdateAvailableContext) => void;
}

export async function getHtmlBuildTime(options: GetHtmlBuildTimeOptions = {}): Promise<string | null> {
  const { baseUrl = '/', fetcher = globalThis.fetch?.bind(globalThis) } = options;

  if (!fetcher) return null;

  const res = await fetcher(`${baseUrl}index.html?time=${Date.now()}`);

  if (!res.ok) {
    return null;
  }

  const html = await res.text();
  const match = html.match(/<meta name="buildTime" content="([^"]*)">/);

  return match?.[1] || null;
}

export function setupAppVersionNotification(options: SetupAppVersionNotificationOptions) {
  const {
    baseUrl = '/',
    currentBuildTime,
    enabled,
    interval = DEFAULT_UPDATE_CHECK_INTERVAL,
    onError,
    onUpdateAvailable
  } = options;

  if (!enabled || typeof document === 'undefined') return;

  let isPromptOpen = false;
  let updateInterval: ReturnType<typeof setInterval> | undefined;

  async function checkForUpdates() {
    if (isPromptOpen) return;

    try {
      const latestBuildTime = await getHtmlBuildTime({ baseUrl });

      if (!latestBuildTime || latestBuildTime === currentBuildTime) {
        return;
      }

      isPromptOpen = true;

      onUpdateAvailable({
        currentBuildTime,
        latestBuildTime,
        markPromptClosed() {
          isPromptOpen = false;
        }
      });
    } catch (error) {
      onError?.(error);
    }
  }

  function startUpdateInterval() {
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    updateInterval = setInterval(checkForUpdates, interval);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
      startUpdateInterval();
    }
  }

  if (document.visibilityState === 'visible') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startUpdateInterval();
  }

  return () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
