/**
 * Local status summary: fetch selected providers' public feeds directly from the
 * extension, normalize, dedupe and cap. This replaces the former server endpoint
 * `GET /api/v1/status/summary` — no backend involved.
 */

import { PROVIDERS, VERIFIED_PROVIDERS } from './registry';
import { parseRssFeed } from './parsers/rss';
import { parseStatuspage } from './parsers/statuspage';
import { parseGcpIncidents } from './parsers/gcp';
import { parseAlibaba } from './parsers/alibaba';
import { parseTencent } from './parsers/tencent';
import { severityRank } from './severity';
import type { NormalizedEvent, ProviderDef } from './types';

const FETCH_TIMEOUT_MS = 20_000;
const SUMMARY_MAX_EVENTS = 80;

export interface StatusSummary {
  fetchedAt: string;
  events: NormalizedEvent[];
  errors: string[];
}

function startedMs(e: NormalizedEvent): number {
  return e.started_at ? Date.parse(e.started_at) : 0;
}

/**
 * Feeds often repeat the same incident (same external_id) across updates.
 * Keep the worst severity; on ties prefer the newest started_at.
 */
export function dedupeAndLimit(
  items: NormalizedEvent[],
  max = SUMMARY_MAX_EVENTS
): NormalizedEvent[] {
  const map = new Map<string, NormalizedEvent>();
  for (const item of items) {
    const key = `${item.provider}|${item.external_id}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, item);
      continue;
    }
    const ra = severityRank(prev.severity);
    const rb = severityRank(item.severity);
    if (rb > ra || (rb === ra && startedMs(item) >= startedMs(prev))) {
      map.set(key, item);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => startedMs(b) - startedMs(a))
    .slice(0, max);
}

async function fetchProvider(def: ProviderDef): Promise<NormalizedEvent[]> {
  const res = await fetch(def.feedUrl, {
    // Do not set User-Agent: it's a forbidden header in browser fetch and would be dropped.
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  switch (def.parser) {
    case 'rss':
      return parseRssFeed(await res.text(), def.code);
    case 'statuspage':
      return parseStatuspage(await res.json(), def.code);
    case 'gcp':
      return parseGcpIncidents(await res.json());
    case 'alibaba':
      return parseAlibaba(await res.json(), def.code);
    case 'tencent':
      return parseTencent(await res.json(), def.code);
    default:
      return [];
  }
}

/**
 * @param codes Optional whitelist of provider codes to fetch. Defaults to the
 *   verified providers (experimental ones are only fetched when named explicitly).
 */
export async function fetchStatusSummary(codes?: string[]): Promise<StatusSummary> {
  const wanted =
    codes && codes.length ? PROVIDERS.filter(p => codes.includes(p.code)) : VERIFIED_PROVIDERS;

  const errors: string[] = [];
  const all: NormalizedEvent[] = [];

  await Promise.all(
    wanted.map(async def => {
      try {
        all.push(...(await fetchProvider(def)));
      } catch (e) {
        errors.push(`${def.code}: ${e instanceof Error ? e.message : String(e)}`);
      }
    })
  );

  return {
    fetchedAt: new Date().toISOString(),
    events: dedupeAndLimit(all),
    errors
  };
}
