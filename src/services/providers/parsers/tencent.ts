/**
 * Tencent Cloud status adapter.
 *
 * status.tencentcloud.com is a Next.js SPA backed by an undocumented JSON API.
 * `/v1/api/status/DescribeHappening?BelongSite=1` returns the current site-wide
 * banner: `{ Response: { Data: { Id, Desc, Status, IsShow, ... } } }` (no auth).
 * `Status` is one of NORMAL / NOTIFY / ABNORMAL (see the period endpoint's Summary
 * counts). We emit an event only when the vendor flags it visible (`IsShow`) or the
 * status is not NORMAL. Details link out to the official status page.
 */

import { stableId } from '../hash';
import type { NormalizedEvent, Severity } from '../types';

const STATUS_PAGE = 'https://status.tencentcloud.com/';

interface HappeningEntry {
  Id?: number | string;
  Desc?: string;
  Status?: string;
  IsShow?: boolean;
  RelatedId?: string;
}

function statusToSeverity(status: string | undefined): Severity {
  switch ((status || '').toUpperCase()) {
    case 'ABNORMAL':
      return 'major';
    case 'NOTIFY':
      return 'minor';
    default:
      return 'info';
  }
}

function firstLine(text: string): string {
  const line = text.split(/\r?\n/).find(l => l.trim());
  return (line || text).trim().slice(0, 200);
}

export function parseTencent(json: unknown, provider = 'TENCENT'): NormalizedEvent[] {
  const data = (json as { Response?: { Data?: unknown } })?.Response?.Data;
  if (!data) {
    return [];
  }
  const entries = (Array.isArray(data) ? data : [data]) as HappeningEntry[];
  const out: NormalizedEvent[] = [];

  for (const entry of entries) {
    const status = entry.Status;
    const active = entry.IsShow === true || (!!status && status.toUpperCase() !== 'NORMAL');
    const desc = (entry.Desc || '').trim();
    if (!active || !desc) {
      continue;
    }
    out.push({
      provider,
      external_id: stableId(`tencent:${entry.Id ?? desc}`),
      title: firstLine(desc),
      body: desc.slice(0, 8000),
      severity: statusToSeverity(status),
      region: null,
      service_key: null,
      service_name: null,
      source_url: STATUS_PAGE,
      started_at: null
    });
  }
  return out;
}
