import { getProvider } from '@/services/providers/registry';
import type { ServiceStatus, StatusType } from '@/types/status';
import { getProviderDisplayName, getProviderId } from './providerDisplay';

export interface ProviderSummary {
  id: string;
  code: string;
  name: string;
  worst: StatusType;
  total: number;
  regions: number;
  counts: Record<StatusType, number>;
  statusPageUrl?: string;
  /** One actionable summary for the provider's most important active event. */
  headline?: string;
  /** Deep link for the headline event; falls back to the registry status page. */
  incidentSourceUrl?: string;
}

export interface OverallHealth {
  total: number;
  operational: number;
  degraded: number;
  outage: number;
  maintenance: number;
  affected: number;
  worst: StatusType | null;
}

const severity: Record<StatusType, number> = {
  outage: 4,
  degraded: 3,
  maintenance: 2,
  operational: 1
};

/** True when `candidate` outranks `current` as a provider's headline event. */
function isMoreImportant(candidate: ServiceStatus, current: ServiceStatus | undefined): boolean {
  if (!current) return true;
  const delta = severity[candidate.status] - severity[current.status];
  return delta !== 0 ? delta > 0 : candidate.updatedAt > current.updatedAt;
}

export function deriveProviderSummaries(services: ServiceStatus[]): ProviderSummary[] {
  const grouped = new Map<
    string,
    ProviderSummary & { regionSet: Set<string>; picked?: ServiceStatus }
  >();
  for (const service of services) {
    const code = service.provider.toUpperCase();
    const current = grouped.get(code) ?? {
      id: getProviderId(code),
      code,
      name: getProviderDisplayName(code),
      worst: 'operational',
      total: 0,
      regions: 0,
      counts: { operational: 0, degraded: 0, outage: 0, maintenance: 0 },
      statusPageUrl: getProvider(code)?.statusPageUrl,
      regionSet: new Set<string>()
    };
    current.total += 1;
    current.counts[service.status] += 1;
    current.regionSet.add(service.regionId || service.region);
    if (severity[service.status] > severity[current.worst]) current.worst = service.status;
    if (service.status !== 'operational' && isMoreImportant(service, current.picked)) {
      current.picked = service;
    }
    grouped.set(code, current);
  }
  return [...grouped.values()]
    .map(({ regionSet, picked, ...summary }) => {
      const result: ProviderSummary = { ...summary, regions: regionSet.size };
      if (picked) {
        result.headline = picked.statusMessage ?? picked.incident?.title ?? picked.serviceName;
        result.incidentSourceUrl = picked.sourceUrl ?? summary.statusPageUrl;
      }
      return result;
    })
    .sort((a, b) => severity[b.worst] - severity[a.worst] || a.name.localeCompare(b.name));
}

export function deriveOverallHealth(summaries: ProviderSummary[]): OverallHealth {
  const result: OverallHealth = {
    total: summaries.length,
    operational: 0,
    degraded: 0,
    outage: 0,
    maintenance: 0,
    affected: 0,
    worst: null
  };
  for (const summary of summaries) {
    result[summary.worst] += 1;
    if (summary.worst !== 'operational') result.affected += 1;
    if (result.worst === null || severity[summary.worst] > severity[result.worst]) {
      result.worst = summary.worst;
    }
  }
  return result;
}
