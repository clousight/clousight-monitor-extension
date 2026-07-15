/** Fired after the notification list changes (read/dismiss/load) so nav can refresh its badge. */
export const CLOUSIGHT_UNREAD_CHANGED = 'clousight:unread-changed';

/** Ask NotificationCenter to reload (e.g. after returning from Settings). */
export const CLOUSIGHT_NOTIFICATIONS_REFRESH = 'clousight:notifications-refresh';

export function emitUnreadChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUSIGHT_UNREAD_CHANGED, { bubbles: false }));
  }
}

export function emitNotificationsRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUSIGHT_NOTIFICATIONS_REFRESH, { bubbles: false }));
  }
}
