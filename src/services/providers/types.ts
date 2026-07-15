/**
 * Shared types for local (in-extension) provider status ingestion.
 * Ported from the former server ingest pipeline — now runs in the MV3 service worker.
 */

export const SEVERITY_ORDER = ['info', 'maintenance', 'minor', 'major', 'critical'] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

/** A single normalized incident, provider-agnostic. */
export interface NormalizedEvent {
  provider: string;
  external_id: string;
  title: string;
  body: string | null;
  severity: Severity;
  region: string | null;
  service_key: string | null;
  service_name: string | null;
  source_url: string | null;
  started_at: string | null;
}

/**
 * How a provider's feed is shaped, so parsers stay declarative.
 * 'alibaba' / 'tencent' are bespoke JSON adapters for those vendors' undocumented
 * status APIs (their status sites are SPAs with no generic RSS/Statuspage feed).
 */
export type ParserType = 'rss' | 'statuspage' | 'gcp' | 'alibaba' | 'tencent';

export interface ProviderDef {
  /** Stable uppercase code used across storage and UI, e.g. "AWS". */
  code: string;
  /** Human-readable name for display. */
  name: string;
  /** Fully-qualified feed URL to fetch (Statuspage: the /api/v2/incidents.json URL). */
  feedUrl: string;
  /** Which parser turns the feed into NormalizedEvent[]. */
  parser: ParserType;
  /** Official human-facing status page (used for the "details" link). */
  statusPageUrl: string;
  /** Origin match pattern for host permissions (install-time or on-demand). */
  origin: string;
  /**
   * Experimental = we don't yet have a verified machine-readable feed for this
   * provider (e.g. the status site is a JS-rendered SPA with no public JSON/RSS,
   * or the endpoint is unreachable outside its home region). Experimental
   * providers are skipped by default and are a great "add a provider"
   * contribution — see CONTRIBUTING.md.
   */
  experimental?: boolean;
}
