import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotifications,
  addNotifications,
  notificationFromEvent,
  pruneNotifications,
  markRead,
  markAllSeen,
  clearAll,
  unreadCount,
  type LocalNotification
} from './notifications';
import type { NormalizedEvent } from './providers/types';

function ev(id: string): NormalizedEvent {
  return {
    provider: 'AWS',
    external_id: id,
    title: `incident ${id}`,
    body: null,
    severity: 'major',
    region: null,
    service_key: null,
    service_name: null,
    source_url: 'https://status.aws.amazon.com/',
    started_at: null
  };
}

describe('notifications (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear());

  it('adds and de-duplicates by id', async () => {
    await addNotifications([notificationFromEvent(ev('1'))]);
    await addNotifications([notificationFromEvent(ev('1')), notificationFromEvent(ev('2'))]);
    const list = await getNotifications();
    expect(list).toHaveLength(2);
    expect(await unreadCount()).toBe(2);
  });

  it('markRead lowers the unread count', async () => {
    await addNotifications([notificationFromEvent(ev('1')), notificationFromEvent(ev('2'))]);
    await markRead(['AWS-1']);
    expect(await unreadCount()).toBe(1);
  });

  it('markAllSeen flips seen without affecting read', async () => {
    await addNotifications([notificationFromEvent(ev('1'))]);
    await markAllSeen();
    const list = await getNotifications();
    expect(list[0].seen).toBe(true);
    expect(list[0].read).toBe(false);
  });

  it('clearAll empties the store', async () => {
    await addNotifications([notificationFromEvent(ev('1'))]);
    await clearAll();
    expect(await getNotifications()).toEqual([]);
  });
});

describe('pruneNotifications retention', () => {
  function note(id: string, createdAt: number): LocalNotification {
    return {
      id,
      createdAt,
      read: false,
      seen: false,
      provider: 'AWS',
      title: id,
      body: null,
      severity: 'major',
      region: null,
      sourceUrl: null
    };
  }

  const now = 1_000 * 24 * 60 * 60 * 1000; // an arbitrary fixed "now"
  const day = 24 * 60 * 60 * 1000;

  it('drops entries older than the max age', () => {
    const kept = pruneNotifications(
      [note('fresh', now - 10 * day), note('stale', now - 31 * day)],
      now
    );
    expect(kept.map(n => n.id)).toEqual(['fresh']);
  });

  it('caps the total count, keeping the newest (list is prepend-ordered)', () => {
    const list = Array.from({ length: 5 }, (_, i) => note(`n${i}`, now - i * day));
    const kept = pruneNotifications(list, now, 30 * day, 3);
    expect(kept.map(n => n.id)).toEqual(['n0', 'n1', 'n2']);
  });
});
