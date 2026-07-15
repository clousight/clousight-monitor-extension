/**
 * Local notification history (chrome.storage.local). Entries are created by the
 * background worker when a fetched incident matches a local subscription rule.
 * Replaces the former server-backed notifications feed.
 */

import type { NormalizedEvent, Severity } from './providers/types';

const STORAGE_KEY = 'notifications';
const MAX_STORED = 100;

export interface LocalNotification {
  id: string;
  createdAt: number;
  read: boolean;
  seen: boolean;
  provider: string;
  title: string;
  body: string | null;
  severity: Severity;
  region: string | null;
  sourceUrl: string | null;
  subscriptionId?: string;
}

function hasLocal(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export async function getNotifications(): Promise<LocalNotification[]> {
  if (hasLocal()) {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as LocalNotification[]) ?? [];
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LocalNotification[];
  } catch {
    return [];
  }
}

async function writeAll(list: LocalNotification[]): Promise<void> {
  const trimmed = list.slice(0, MAX_STORED);
  if (hasLocal()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: trimmed });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function notificationFromEvent(
  event: NormalizedEvent,
  subscriptionId?: string
): LocalNotification {
  return {
    id: `${event.provider}-${event.external_id}`,
    createdAt: Date.now(),
    read: false,
    seen: false,
    provider: event.provider,
    title: event.title,
    body: event.body,
    severity: event.severity,
    region: event.region,
    sourceUrl: event.source_url,
    subscriptionId
  };
}

/** Prepend new notifications, de-duplicated by id (keeps existing read/seen state). */
export async function addNotifications(items: LocalNotification[]): Promise<void> {
  if (items.length === 0) {
    return;
  }
  const existing = await getNotifications();
  const known = new Set(existing.map(n => n.id));
  const fresh = items.filter(n => !known.has(n.id));
  if (fresh.length === 0) {
    return;
  }
  await writeAll([...fresh, ...existing]);
}

export async function markRead(ids: string[]): Promise<void> {
  const set = new Set(ids);
  const list = await getNotifications();
  await writeAll(list.map(n => (set.has(n.id) ? { ...n, read: true } : n)));
}

export async function markAllSeen(): Promise<void> {
  const list = await getNotifications();
  if (list.every(n => n.seen)) {
    return;
  }
  await writeAll(list.map(n => ({ ...n, seen: true })));
}

export async function clearAll(): Promise<void> {
  await writeAll([]);
}

export async function unreadCount(): Promise<number> {
  const list = await getNotifications();
  return list.filter(n => !n.read).length;
}
