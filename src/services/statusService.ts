/**
 * Cloud status: fetched locally in the extension from each provider's public feed.
 * No backend — see src/services/providers/. Incident rows link out to the
 * provider's official status page.
 */

import { ServiceStatus, StatusType } from '@/types/status';
import { fetchStatusSummary } from './providers/fetchSummary';
import { VERIFIED_PROVIDERS, getProvider } from './providers/registry';
import type { NormalizedEvent } from './providers/types';

// Providers we actually fetch by default; only these get an "all-clear" placeholder
// when they report no incidents (otherwise unfetched providers would look operational).
const DEFAULT_ORDER = VERIFIED_PROVIDERS.map(p => p.code);

function mapSeverityToStatus(sev: string): StatusType {
  switch (sev) {
    case 'critical':
    case 'major':
      return 'outage';
    case 'minor':
      return 'degraded';
    case 'maintenance':
      return 'maintenance';
    case 'info':
      return 'operational';
    default:
      return 'degraded';
  }
}

function eventToServiceStatus(ev: NormalizedEvent, idx: number): ServiceStatus {
  const st = mapSeverityToStatus(ev.severity);
  const started = ev.started_at ? Date.parse(ev.started_at) : Date.now();
  const providerDef = getProvider(ev.provider);
  return {
    id: `${ev.provider}-${ev.external_id}-${idx}`,
    provider: ev.provider,
    serviceId: ev.service_key || 'incident',
    serviceName: ev.service_name || ev.title.slice(0, 120),
    region: ev.region || '—',
    regionId: ev.region || undefined,
    status: st,
    statusMessage: ev.title,
    sourceUrl: ev.source_url || providerDef?.statusPageUrl,
    resolved: ev.resolved ?? false,
    updatedAt: started,
    incident: {
      id: ev.external_id,
      title: ev.title,
      startTime: started
    }
  };
}

function operationalPlaceholder(provider: string): ServiceStatus {
  const providerDef = getProvider(provider);
  return {
    id: `${provider}-all-clear`,
    provider,
    serviceId: 'summary',
    serviceName: 'No active incidents',
    region: '—',
    status: 'operational',
    sourceUrl: providerDef?.statusPageUrl,
    updatedAt: Date.now()
  };
}

/**
 * Map normalized events into ServiceStatus rows, adding an "all-clear" placeholder
 * for every fetched provider that reported no incidents.
 */
export function eventsToServiceStatuses(
  events: NormalizedEvent[],
  order: string[] = DEFAULT_ORDER
): ServiceStatus[] {
  const byProvider = new Set(events.map(e => e.provider.toUpperCase()));
  const out: ServiceStatus[] = events.map((ev, i) => eventToServiceStatus(ev, i));
  for (const p of order) {
    if (!byProvider.has(p)) {
      out.push(operationalPlaceholder(p));
    }
  }
  return out;
}

/**
 * Fetch live cloud status directly from provider feeds.
 * @param codes Optional whitelist of provider codes; defaults to verified providers.
 */
export async function fetchCloudStatus(codes?: string[]): Promise<ServiceStatus[]> {
  try {
    const { events, errors } = await fetchStatusSummary(codes);
    if (errors.length) {
      console.warn('Status summary source errors:', errors);
    }
    return eventsToServiceStatuses(events, codes && codes.length ? codes : DEFAULT_ORDER);
  } catch (e) {
    console.error('fetchCloudStatus:', e);
    return [];
  }
}
