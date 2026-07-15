import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNotifications,
  addNotifications,
  notificationFromEvent,
  markRead,
  markAllSeen,
  clearAll,
  unreadCount
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
