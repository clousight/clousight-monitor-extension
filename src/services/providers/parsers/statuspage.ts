/**
 * Atlassian Statuspage-style JSON parser: GET {base}/api/v2/incidents.json
 * (Alibaba, Tencent, Huawei, Volcano).
 */

import { inferSeverityFromText } from '../severity';
import { stableId } from '../hash';
import type { NormalizedEvent, Severity } from '../types';

interface StatuspageIncident {
  id: string;
  name: string;
  status: string;
  impact?: string;
  shortlink?: string;
  created_at: string;
  resolved_at?: string | null;
  incident_updates?: Array<{ body: string; created_at: string }>;
}

interface StatuspageResponse {
  incidents?: StatuspageIncident[];
}

function impactToSeverity(impact: string | undefined, resolved: boolean): Severity {
  if (resolved) {
    return 'info';
  }
  const i = (impact || '').toLowerCase();
  if (i === 'critical') {
    return 'critical';
  }
  if (i === 'major') {
    return 'major';
  }
  if (i === 'minor') {
    return 'minor';
  }
  if (i === 'none' || i === 'maintenance') {
    return 'maintenance';
  }
  return inferSeverityFromText(impact || '');
}

export function parseStatuspage(json: unknown, provider: string): NormalizedEvent[] {
  const incidents = (json as StatuspageResponse)?.incidents ?? [];
  const out: NormalizedEvent[] = [];

  for (const inc of incidents) {
    if (!inc.id || !inc.name) {
      continue;
    }
    const resolved = Boolean(inc.resolved_at);
    const body = inc.incident_updates?.[0]?.body?.trim() || null;

    out.push({
      provider,
      external_id: stableId(`${provider}:${inc.id}`),
      title: inc.name.trim().slice(0, 500),
      body: body ? body.slice(0, 8000) : null,
      severity: impactToSeverity(inc.impact, resolved),
      region: null,
      service_key: null,
      service_name: null,
      source_url: inc.shortlink || null,
      started_at: inc.created_at ? new Date(inc.created_at).toISOString() : null
    });
  }
  return out;
}
