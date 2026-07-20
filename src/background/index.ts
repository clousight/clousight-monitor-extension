/**
 * Background service worker for Clousight.
 *
 * Periodically fetches the enabled providers' status locally (no backend), keeps
 * the toolbar badge updated, and raises a browser notification for each new
 * incident at or above the user's chosen minimum severity.
 */

import { fetchStatusSummary } from '../services/providers/fetchSummary';
import { eventsToServiceStatuses } from '../services/statusService';
import { addNotifications, notificationFromEvent } from '../services/notifications';
import { meetsMinSeverity } from '../services/providers/severity';
import { hasProviderOrigin } from '../services/permissions';
import { VERIFIED_PROVIDERS } from '../services/providers/registry';
import type { NormalizedEvent, Severity } from '../services/providers/types';
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
    minSeverity?: Severity;
  };
}

const DEFAULT_MIN_SEVERITY: Severity = 'major';

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
    const now = Date.now();
    await chrome.storage.local.set({
      serviceStatus: services,
      lastUpdated: now,
      providerCheckedAt: await nextProviderCheckedAt(codes, errors, now)
    });
    updateBadge(services);
    await processIncidentNotifications(events);
    return services;
  } catch (error) {
    console.error('Clousight: status check failed', error);
    return [];
  }
}

/**
 * Per-provider "last successfully checked" timestamps. Only providers that
 * fetched without error this round advance to `now`; a provider whose fetch
 * failed keeps its previous timestamp, so the UI can show that its data is
 * stale relative to the others. `errors` entries are formatted "CODE: message".
 */
async function nextProviderCheckedAt(
  codes: string[] | undefined,
  errors: string[],
  now: number
): Promise<Record<string, number>> {
  const attempted = codes ?? VERIFIED_PROVIDERS.map(p => p.code);
  const failed = new Set(errors.map(e => e.split(':')[0].trim()));
  const data = await chrome.storage.local.get('providerCheckedAt');
  const checkedAt: Record<string, number> = { ...(data.providerCheckedAt ?? {}) };
  for (const code of attempted) {
    if (!failed.has(code)) {
      checkedAt[code] = now;
    }
  }
  return checkedAt;
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
 * Raise a notification for each new incident from an enabled provider that meets
 * the user's minimum severity. Providers are already filtered upstream (only
 * enabled+granted providers are fetched), so this just applies the severity gate
 * and de-duplicates against previously-seen events.
 */
async function processIncidentNotifications(events: NormalizedEvent[]): Promise<void> {
  const seen = await readSeen();
  const settings = await getSettings();
  const notify = browserNotificationsEnabled(settings);
  const minSeverity = settings.notifications?.minSeverity ?? DEFAULT_MIN_SEVERITY;

  const fresh = events.filter(ev => !seen.has(`${ev.provider}|${ev.external_id}`));
  const created: NormalizedEvent[] = [];

  for (const ev of fresh) {
    seen.add(`${ev.provider}|${ev.external_id}`);
    if (meetsMinSeverity(ev.severity, minSeverity)) {
      created.push(ev);
      await addNotifications([notificationFromEvent(ev)]);
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
