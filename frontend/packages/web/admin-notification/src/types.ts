/** Notification visual category. */
export type NotificationType = 'error' | 'info' | 'message' | 'success' | 'warning';

/** Notification priority used by the panel metadata. */
export type NotificationPriority = 'high' | 'low' | 'normal' | 'urgent';

/** A notification item managed by the provider. */
export interface NotificationItem {
  /** Main message body shown in the notification panel. */
  content: string;
  /** Optional browser notification icon URL. */
  icon?: string;
  /** Stable notification id. */
  id: string;
  /** Optional destination used when the browser notification is clicked. */
  link?: string;
  /** Extra caller-owned metadata. */
  meta?: Record<string, unknown>;
  /** Priority hint rendered as a panel tag. */
  priority?: NotificationPriority;
  /** Whether the item has been read. */
  read: boolean;
  /** Whether this item should also create a browser notification. */
  showBrowserNotification?: boolean;
  /** Whether this item should skip the notification sound. */
  silent?: boolean;
  /** Creation timestamp in milliseconds. */
  timestamp: number;
  /** Notification title. */
  title: string;
  /** Visual category for icon and color. */
  type: NotificationType;
}

/** Notification runtime configuration. */
export interface NotificationConfig {
  /** Whether browser notifications are enabled. */
  browserNotificationEnabled: boolean;
  /** Whether do-not-disturb mode is enabled. */
  doNotDisturb: boolean;
  /** Local time range used by do-not-disturb mode. */
  doNotDisturbTime?: {
    /** End time in HH:mm format. */
    end: string;
    /** Start time in HH:mm format. */
    start: string;
  };
  /** Maximum number of retained notifications. */
  maxNotifications: number;
  /** Whether notification sound is enabled. */
  soundEnabled: boolean;
}

/** Input used when creating a new notification. */
export type AddNotificationInput = Omit<NotificationItem, 'id' | 'read' | 'timestamp'> &
  Partial<Pick<NotificationItem, 'id' | 'read' | 'timestamp'>>;

/** Options shared by shortcut notification creators. */
export type NotificationShortcutOptions = Partial<Omit<NotificationItem, 'content' | 'id' | 'read' | 'timestamp' | 'title' | 'type'>> &
  Partial<Pick<NotificationItem, 'id' | 'read' | 'timestamp'>>;

/** Options used by the notification state hook. */
export interface UseNotificationOptions {
  /** Initial configuration merged with the package defaults. */
  defaultConfig?: Partial<NotificationConfig>;
  /** Callback fired when a browser notification cannot be displayed. */
  onBrowserNotificationError?: (error: unknown) => void;
  /** Callback fired when the current browser has no Notification API. */
  onBrowserNotificationUnsupported?: () => void;
  /** Callback fired when a browser notification link should be opened. */
  onNavigate?: (link: string, notification: NotificationItem) => void;
  /** Callback fired when the notification sound cannot be played. */
  onPlaySoundError?: (error: unknown) => void;
  /** Callback fired when requesting notification permission fails. */
  onRequestPermissionError?: (error: unknown) => void;
  /** Optional notification sound URL owned by the host app. */
  soundUrl?: string;
}
