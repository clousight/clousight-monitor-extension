/**
 * Alibaba Cloud status adapter.
 *
 * status.alibabacloud.com is a SPA backed by an undocumented JSON API. The
 * "incidents in progress" endpoint returns `{ data: [...], success: true }` and
 * needs no auth. When there are no incidents (the common case) `data` is empty
 * and we report operational.
 *
 * The per-incident field names are only observable during a live incident, so we
 * extract a title/body best-effort and always fall back to a summary that links
 * to the official status page (matching the product's "details link out" model).
 */

import { inferSeverityFromText } from '../severity';
import { stableId } from '../hash';
import type { NormalizedEvent } from '../types';

const STATUS_PAGE = 'https://status.alibabacloud.com/';

function firstString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return null;
}

function firstTime(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && v > 0) {
      return new Date(v).toISOString();
    }
    if (typeof v === 'string' && v.trim()) {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) {
        return new Date(t).toISOString();
      }
    }
  }
  return null;
}

export function parseAlibaba(json: unknown, provider = 'ALIBABA'): NormalizedEvent[] {
  const data = (json as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((raw, idx) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const title =
      firstString(item, ['title', 'name', 'eventName', 'summary', 'productName']) ||
      'Alibaba Cloud incident in progress';
    const body = firstString(item, ['description', 'desc', 'content', 'detail', 'message']);
    const region = firstString(item, ['region', 'regionId', 'regionName']);
    const started = firstTime(item, [
      'beginTime',
      'startTime',
      'gmtCreate',
      'createTime',
      'startDate'
    ]);
    const idSeed = firstString(item, ['id', 'eventId', 'uuid', 'code']) || `${title}:${idx}`;

    // No verified severity field yet: infer from text, but an in-progress incident
    // should never read as "info" (which the UI shows as operational).
    const inferred = inferSeverityFromText(`${title} ${body ?? ''}`);

    return {
      provider,
      external_id: stableId(`alibaba:${idSeed}`),
      title: title.slice(0, 500),
      body: body ? body.slice(0, 8000) : null,
      severity: inferred === 'info' ? 'major' : inferred,
      region: region || null,
      service_key: null,
      service_name: firstString(item, ['productName', 'product']),
      source_url: STATUS_PAGE,
      started_at: started
    };
  });
}
