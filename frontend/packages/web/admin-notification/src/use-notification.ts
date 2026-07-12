import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';

import type {
  AddNotificationInput,
  NotificationConfig,
  NotificationItem,
  NotificationShortcutOptions,
  UseNotificationOptions
} from './types';

/** Default notification runtime configuration. */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  browserNotificationEnabled: true,
  doNotDisturb: false,
  maxNotifications: 99,
  soundEnabled: true
};

function createNotificationConfig(defaultConfig?: Partial<NotificationConfig>) {
  return {
    ...DEFAULT_NOTIFICATION_CONFIG,
    ...defaultConfig
  };
}

function getCurrentTimeText() {
  const now = new Date();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');

  return `${hour}:${minute}`;
}

function isWithinTimeRange(currentTime: string, start: string, end: string) {
  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  }

  return currentTime >= start || currentTime <= end;
}

/** Manage admin notifications and browser notification side effects. */
export function useNotification(options: UseNotificationOptions = {}) {
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const soundUrlRef = useRef<string | undefined>(undefined);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [config, setConfig] = useState<NotificationConfig>(() => createNotificationConfig(options.defaultConfig));
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const unreadCount = notifications.filter(item => !item.read).length;

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    setNotificationPermission(window.Notification.permission);
  }, []);

  function isDoNotDisturbTime() {
    if (!config.doNotDisturb || !config.doNotDisturbTime) {
      return false;
    }

    const currentTime = getCurrentTimeText();
    const { end, start } = config.doNotDisturbTime;

    return isWithinTimeRange(currentTime, start, end);
  }

  function getNotificationSound() {
    if (!options.soundUrl || typeof Audio === 'undefined') {
      return null;
    }

    if (!soundRef.current || soundUrlRef.current !== options.soundUrl) {
      soundRef.current = new Audio(options.soundUrl);
      soundUrlRef.current = options.soundUrl;
    }

    return soundRef.current;
  }

  function playNotificationSound() {
    if (!config.soundEnabled || isDoNotDisturbTime()) {
      return;
    }

    const notificationSound = getNotificationSound();

    if (!notificationSound) {
      return;
    }

    try {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(error => {
        options.onPlaySoundError?.(error);
      });
    } catch (error) {
      options.onPlaySoundError?.(error);
    }
  }

  function showBrowserNotification(notification: NotificationItem) {
    if (!config.browserNotificationEnabled || isDoNotDisturbTime()) {
      return;
    }

    if (notificationPermission !== 'granted') {
      return;
    }

    if (notification.silent || notification.showBrowserNotification === false) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const browserNotification = new window.Notification(notification.title, {
        body: notification.content,
        icon: notification.icon
      });

      browserNotification.addEventListener('click', () => {
        window.focus();

        if (notification.link) {
          if (options.onNavigate) {
            options.onNavigate(notification.link, notification);
          } else {
            window.location.href = notification.link;
          }
        }

        browserNotification.close();
      });
    } catch (error) {
      options.onBrowserNotificationError?.(error);
    }
  }

  async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      options.onBrowserNotificationUnsupported?.();
      return false;
    }

    try {
      const permission = await window.Notification.requestPermission();
      setNotificationPermission(permission);

      return permission === 'granted';
    } catch (error) {
      options.onRequestPermissionError?.(error);
      return false;
    }
  }

  function addNotification(notification: AddNotificationInput) {
    const newNotification: NotificationItem = {
      id: notification.id ?? nanoid(),
      read: notification.read ?? false,
      timestamp: notification.timestamp ?? Date.now(),
      ...notification
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];

      if (updated.length > config.maxNotifications) {
        return updated.slice(0, config.maxNotifications);
      }

      return updated;
    });

    if (!newNotification.silent) {
      playNotificationSound();
    }

    if (newNotification.showBrowserNotification !== false) {
      showBrowserNotification(newNotification);
    }

    return newNotification.id;
  }

  function addInfoNotification(title: string, content: string, shortcutOptions: NotificationShortcutOptions = {}) {
    return addNotification({ ...shortcutOptions, content, title, type: 'info' });
  }

  function addSuccessNotification(title: string, content: string, shortcutOptions: NotificationShortcutOptions = {}) {
    return addNotification({ ...shortcutOptions, content, title, type: 'success' });
  }

  function addWarningNotification(title: string, content: string, shortcutOptions: NotificationShortcutOptions = {}) {
    return addNotification({ ...shortcutOptions, content, title, type: 'warning' });
  }

  function addErrorNotification(title: string, content: string, shortcutOptions: NotificationShortcutOptions = {}) {
    return addNotification({ ...shortcutOptions, content, title, type: 'error' });
  }

  function addMessageNotification(title: string, content: string, shortcutOptions: NotificationShortcutOptions = {}) {
    return addNotification({ ...shortcutOptions, content, title, type: 'message' });
  }

  function markAsRead(id: string) {
    setNotifications(prev => prev.map(item => (item.id === id ? { ...item, read: true } : item)));
  }

  function markAllAsRead() {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })));
  }

  function removeNotification(id: string) {
    setNotifications(prev => prev.filter(item => item.id !== id));
  }

  function clearAllNotifications() {
    setNotifications([]);
  }

  function clearReadNotifications() {
    setNotifications(prev => prev.filter(item => !item.read));
  }

  function updateConfig(updates: Partial<NotificationConfig>) {
    setConfig(prev => ({ ...prev, ...updates }));
  }

  return {
    addErrorNotification,
    addInfoNotification,
    addMessageNotification,
    addNotification,
    addSuccessNotification,
    addWarningNotification,
    clearAllNotifications,
    clearReadNotifications,
    config,
    markAllAsRead,
    markAsRead,
    notificationPermission,
    notifications,
    removeNotification,
    requestNotificationPermission,
    unreadCount,
    updateConfig
  };
}
