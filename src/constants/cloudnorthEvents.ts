/** Fired after server notification list changes (read/dismiss/load) so nav can refresh badge. */
export const CLOUDNORTH_UNREAD_CHANGED = 'cloudnorth:unread-changed';

/** Ask NotificationCenter to reload (e.g. after returning from Settings). */
export const CLOUDNORTH_NOTIFICATIONS_REFRESH = 'cloudnorth:notifications-refresh';

export function emitUnreadChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUDNORTH_UNREAD_CHANGED, { bubbles: false }));
  }
}

export function emitNotificationsRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUDNORTH_NOTIFICATIONS_REFRESH, { bubbles: false }));
  }
}
