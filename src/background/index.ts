/**
 * Background service worker for Clousight.
 *
 * Periodically fetches cloud provider status locally (no backend), keeps the
 * toolbar badge updated, and raises a browser notification when a fetched
 * incident matches one of the user's local subscription rules.
 */

import { fetchStatusSummary } from '../services/providers/fetchSummary';
import { eventsToServiceStatuses } from '../services/statusService';
import { getSubscriptions } from '../services/subscriptions';
import { matchingSubscriptions } from '../services/matcher';
import { addNotifications, notificationFromEvent } from '../services/notifications';
import { hasProviderOrigin } from '../services/permissions';
import type { NormalizedEvent } from '../services/providers/types';
import { ServiceStatus } from '../types/status';

const STATUS_ALARM = 'statusCheck';
const DEFAULT_CHECK_INTERVAL = 5;
const SEEN_KEY = 'seenEventIds';
const SEEN_MAX = 500;
const NOTIFY_BURST_MAX = 3;

interface StoredSettings {
  checkInterval?: number;
  checkOnStartup?: boolean;
  providers?: string[];
  notifications?: {
    enabled?: boolean;
    browser?: boolean;
    channels?: { browser?: boolean };
  };
}

async function getSettings(): Promise<StoredSettings> {
  const { settings } = await chrome.storage.sync.get('settings');
  return (settings as StoredSettings) ?? {};
}

function browserNotificationsEnabled(s: StoredSettings): boolean {
  if (s.notifications?.enabled === false) {
    return false;
  }
  // Tolerate both settings shapes (flat `browser` and nested `channels.browser`).
  return s.notifications?.browser ?? s.notifications?.channels?.browser ?? true;
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  setupPeriodicCheck(settings.checkInterval || DEFAULT_CHECK_INTERVAL);
  if (settings.checkOnStartup !== false) {
    void checkStatus();
  }
});

chrome.runtime.onStartup.addListener(() => {
  void checkStatus();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === STATUS_ALARM) {
    void checkStatus();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.action) {
    case 'getStatus':
      void getLatestStatus().then(status => sendResponse({ status }));
      return true;
    case 'forceRefresh':
      void checkStatus().then(status => sendResponse({ status }));
      return true;
    case 'updateCheckInterval':
      setupPeriodicCheck(message.interval || DEFAULT_CHECK_INTERVAL);
      sendResponse({ success: true });
      return false;
    default:
      return false;
  }
});

function setupPeriodicCheck(intervalMinutes: number): void {
  chrome.alarms.clear(STATUS_ALARM, () => {
    chrome.alarms.create(STATUS_ALARM, { periodInMinutes: Math.max(1, intervalMinutes) });
  });
}

async function checkStatus(): Promise<ServiceStatus[]> {
  try {
    const settings = await getSettings();
    // Only fetch enabled providers (undefined → verified defaults), and only those
    // whose host origin is actually granted (experimental ones are opt-in).
    let codes = Array.isArray(settings.providers) ? settings.providers : undefined;
    if (codes) {
      const granted = await Promise.all(
        codes.map(async c => ((await hasProviderOrigin(c)) ? c : null))
      );
      codes = granted.filter((c): c is string => c !== null);
    }
    const { events, errors } = await fetchStatusSummary(codes);
    if (errors.length) {
      console.warn('Clousight: some sources failed', errors);
    }
    const services = eventsToServiceStatuses(events, codes);
    await chrome.storage.local.set({ serviceStatus: services, lastUpdated: Date.now() });
    updateBadge(services);
    await processIncidentNotifications(events);
    return services;
  } catch (error) {
    console.error('Clousight: status check failed', error);
    return [];
  }
}

async function getLatestStatus(): Promise<ServiceStatus[]> {
  const data = await chrome.storage.local.get('serviceStatus');
  return (data.serviceStatus as ServiceStatus[]) || [];
}

async function readSeen(): Promise<Set<string>> {
  const data = await chrome.storage.local.get(SEEN_KEY);
  return new Set((data[SEEN_KEY] as string[]) || []);
}

async function writeSeen(seen: Set<string>): Promise<void> {
  const arr = Array.from(seen).slice(-SEEN_MAX);
  await chrome.storage.local.set({ [SEEN_KEY]: arr });
}

/**
 * Match freshly-fetched incidents against local subscription rules and raise a
 * notification for each new match. No rules → no notifications (badge still updates).
 */
async function processIncidentNotifications(events: NormalizedEvent[]): Promise<void> {
  const subs = await getSubscriptions();
  const seen = await readSeen();
  const settings = await getSettings();
  const notify = browserNotificationsEnabled(settings);

  const fresh = events.filter(ev => !seen.has(`${ev.provider}|${ev.external_id}`));
  const created: NormalizedEvent[] = [];

  for (const ev of fresh) {
    seen.add(`${ev.provider}|${ev.external_id}`);
    if (subs.length === 0) {
      continue;
    }
    const matched = matchingSubscriptions(ev, subs);
    if (matched.length > 0) {
      created.push(ev);
      await addNotifications([notificationFromEvent(ev, matched[0].id)]);
    }
  }

  if (notify) {
    for (const ev of created.slice(0, NOTIFY_BURST_MAX)) {
      try {
        chrome.notifications.create(`cn-${ev.provider}-${ev.external_id}`, {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon48.png'),
          title: `${ev.provider} · ${ev.severity}`,
          message: ev.title.slice(0, 250),
          priority: 2
        });
      } catch (e) {
        console.warn('chrome.notifications failed', e);
      }
    }
  }

  await writeSeen(seen);
}

function updateBadge(services: ServiceStatus[]): void {
  const issues = services.filter(s => s.status === 'degraded' || s.status === 'outage').length;
  chrome.action.setBadgeText({ text: issues > 0 ? String(issues) : '' });
  if (issues > 0) {
    chrome.action.setBadgeBackgroundColor({ color: issues > 5 ? '#EF4444' : '#F59E0B' });
  }
}

// Initial check when the worker starts.
void checkStatus();
