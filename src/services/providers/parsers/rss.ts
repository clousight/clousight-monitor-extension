/**
 * RSS 2.0 / Atom feed parser (AWS, Azure).
 * Uses fast-xml-parser (pure JS) since the MV3 service worker has no DOMParser
 * and the former server's `rss-parser` relies on Node streams.
 */

import { XMLParser } from 'fast-xml-parser';
import { inferSeverityFromText } from '../severity';
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

export async function parseRssFeed(xml: string, provider: string): Promise<NormalizedEvent[]> {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const out: NormalizedEvent[] = [];

  // RSS 2.0: rss.channel.item[]
  const channel = (doc.rss as Record<string, unknown>)?.channel as
    Record<string, unknown> | undefined;
  const rssItems = asArray(channel?.item as never);

  for (const raw of rssItems) {
    const item = raw as Record<string, unknown>;
    const link = textOf(item.link) || textOf(item.guid);
    if (!link) {
      continue;
    }
    const title = textOf(item.title) || `${provider} update`;
    const description = textOf(item.description) || textOf(item['content:encoded']);
    out.push(buildEvent(provider, link, title, description, textOf(item.pubDate)));
  }

  // Atom: feed.entry[]
  const feed = doc.feed as Record<string, unknown> | undefined;
  const atomEntries = asArray(feed?.entry as never);
  for (const raw of atomEntries) {
    const entry = raw as Record<string, unknown>;
    const link = atomLink(entry.link) || textOf(entry.id);
    if (!link) {
      continue;
    }
    const title = textOf(entry.title) || `${provider} update`;
    const description = textOf(entry.summary) || textOf(entry.content);
    const when = textOf(entry.updated) || textOf(entry.published);
    out.push(buildEvent(provider, link, title, description, when));
  }

  return out;
}

function buildEvent(
  provider: string,
  link: string,
  title: string,
  description: string,
  when: string
): NormalizedEvent {
  return {
    provider,
    external_id: stableId(link),
    title,
    body: description ? description.slice(0, 8000) : null,
    severity: inferSeverityFromText(`${title} ${description}`),
    region: guessAwsLikeRegion(title),
    service_key: null,
    service_name: null,
    source_url: link,
    started_at: toIso(when)
  };
}
