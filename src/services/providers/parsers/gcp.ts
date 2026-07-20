/**
 * Google Cloud incidents.json parser.
 * The feed is the full incident history (can be several MB), so we sort by
 * start time and keep only the most recent window before merging.
 */

import { inferSeverityFromText } from '../severity';
import { stableId } from '../hash';
import type { NormalizedEvent, Severity } from '../types';

const MAX_GCP_INCIDENTS = 100;

interface GcpIncident {
  id?: string;
  number?: string;
  begin?: string;
  end?: string;
  external_desc?: string;
  updates?: Array<{ text?: string; when?: string }>;
}

function mapSeverity(text: string, ended: boolean): Severity {
  return ended ? 'info' : inferSeverityFromText(text);
}

export function parseGcpIncidents(json: unknown): NormalizedEvent[] {
  if (!Array.isArray(json)) {
    return [];
  }
  const list = json as GcpIncident[];
  const out: NormalizedEvent[] = [];

  for (const inc of list) {
    const id = inc.id || inc.number;
    if (!id) {
      continue;
    }
    const title = (inc.external_desc || 'GCP incident').trim().slice(0, 500) || 'GCP incident';
    const body = inc.updates?.[0]?.text?.trim() || inc.external_desc || null;
    const ended = Boolean(inc.end);

    out.push({
      provider: 'GCP',
      external_id: stableId(`gcp:${id}`),
      title,
      body: body ? body.slice(0, 8000) : null,
      severity: mapSeverity(`${title} ${body || ''}`, ended),
      region: null,
      service_key: null,
      service_name: null,
      source_url: `https://status.cloud.google.com/incident/${encodeURIComponent(id)}`,
      started_at: inc.begin ? new Date(inc.begin).toISOString() : null,
      resolved: ended
    });
  }

  return out
    .sort(
      (a, b) =>
        (b.started_at ? Date.parse(b.started_at) : 0) -
        (a.started_at ? Date.parse(a.started_at) : 0)
    )
    .slice(0, MAX_GCP_INCIDENTS);
}
