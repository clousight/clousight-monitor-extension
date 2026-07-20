/**
 * RSS 2.0 / Atom feed parser (AWS, Azure).
 * Uses fast-xml-parser (pure JS) since the MV3 service worker has no DOMParser
 * and the former server's `rss-parser` relies on Node streams.
 */

import { XMLParser } from 'fast-xml-parser';
import { inferSeverityFromText, isResolvedTitle } from '../severity';
import { stableId } from '../hash';
import type { NormalizedEvent } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
}

function textOf(v: unknown): string {
  if (v == null) {
    return '';
  }
  if (typeof v === 'string') {
    return v.trim();
  }
  // fast-xml-parser may return { '#text': '...' } for elements with attributes
  if (typeof v === 'object' && '#text' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)['#text']).trim();
  }
  return String(v).trim();
}

/** Atom <link> can be a string, an object with @_href, or an array of those. */
function atomLink(link: unknown): string {
  for (const l of asArray(link as never)) {
    if (typeof l === 'string') {
      return l;
    }
    const obj = l as Record<string, unknown>;
    if (obj && obj['@_href']) {
      return String(obj['@_href']);
    }
  }
  return '';
}

function guessAwsLikeRegion(title: string): string | null {
  const m = title.match(/\b([a-z]{2}-[a-z]+-\d+)\b/i);
  return m ? m[1].toLowerCase() : null;
}

function toIso(date: string): string | null {
  if (!date) {
    return null;
  }
  const t = Date.parse(date);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

interface RawItem {
  title: string;
  description: string;
  when: string;
  /** Item link; for AWS every item shares the same homepage link. */
  link: string;
  /** Item guid; for AWS this carries the "#<service>_<timestamp>" identity. */
  guid: string;
}

/**
 * Group updates that belong to the same incident. AWS emits a separate <item>
 * for every update, all sharing a "#<service>_<timestamp>" guid prefix, so we
 * key on the service part (timestamp stripped). Feeds without that shape (Atom,
 * generic RSS) fall back to the item's own guid/link, i.e. one group per item.
 */
function incidentKey(guid: string, link: string): string {
  const src = guid || link;
  // AWS guid: "#<service>[-<region>]_<timestamp>" — the service segment may
  // contain hyphens/region (e.g. "multipleservices-me-central-1").
  const m = src.match(/#([a-z0-9-]+)_\d+/i);
  return m ? `svc:${m[1].toLowerCase()}` : src;
}

// An incident with no update within this window is treated as resolved history:
// AWS keeps ended incidents in the feed for months after their "[RESOLVED]" item
// has scrolled off, and a genuinely active incident always has a recent update.
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

function whenMs(item: RawItem): number {
  const t = Date.parse(item.when);
  return Number.isNaN(t) ? 0 : t;
}

export async function parseRssFeed(
  xml: string,
  provider: string,
  now: number = Date.now()
): Promise<NormalizedEvent[]> {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const raw: RawItem[] = [];

  // RSS 2.0: rss.channel.item[]
  const channel = (doc.rss as Record<string, unknown>)?.channel as
    Record<string, unknown> | undefined;
  for (const it of asArray(channel?.item as never)) {
    const item = it as Record<string, unknown>;
    const link = textOf(item.link);
    const guid = textOf(item.guid);
    if (!link && !guid) {
      continue;
    }
    raw.push({
      title: textOf(item.title) || `${provider} update`,
      description: textOf(item.description) || textOf(item['content:encoded']),
      when: textOf(item.pubDate),
      link,
      guid
    });
  }

  // Atom: feed.entry[]
  const feed = doc.feed as Record<string, unknown> | undefined;
  for (const en of asArray(feed?.entry as never)) {
    const entry = en as Record<string, unknown>;
    const link = atomLink(entry.link);
    const guid = textOf(entry.id);
    if (!link && !guid) {
      continue;
    }
    raw.push({
      title: textOf(entry.title) || `${provider} update`,
      description: textOf(entry.summary) || textOf(entry.content),
      when: textOf(entry.updated) || textOf(entry.published),
      link,
      guid
    });
  }

  return groupEvents(provider, raw, now);
}

/**
 * Collapse each incident's updates into one event carrying the LATEST state
 * (so a resolved incident reads as resolved even while older impact updates
 * linger in the feed), while dating it from the EARLIEST update (the real start).
 */
function groupEvents(provider: string, raw: RawItem[], now: number): NormalizedEvent[] {
  const groups = new Map<string, RawItem[]>();
  for (const item of raw) {
    const key = incidentKey(item.guid, item.link);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  const out: NormalizedEvent[] = [];
  for (const [key, items] of groups) {
    items.sort((a, b) => whenMs(a) - whenMs(b));
    const earliest = items[0];
    const latest = items[items.length - 1];
    const latestMs = whenMs(latest);
    const stale = latestMs > 0 && now - latestMs > ACTIVE_WINDOW_MS;
    const resolved = isResolvedTitle(latest.title) || stale;
    // Prefer a link that carries the incident anchor (AWS guid), else the plain link.
    const permalink =
      [latest.link, latest.guid].find(u => u && u.includes('#')) || latest.link || latest.guid;

    out.push({
      provider,
      external_id: stableId(`${provider}:${key}`),
      title: latest.title,
      body: latest.description ? latest.description.slice(0, 8000) : null,
      severity: resolved ? 'info' : inferSeverityFromText(`${latest.title} ${latest.description}`),
      region: guessAwsLikeRegion(latest.title),
      service_key: null,
      service_name: null,
      source_url: permalink || null,
      started_at: toIso(earliest.when),
      resolved
    });
  }
  return out;
}
