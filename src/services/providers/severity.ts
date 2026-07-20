/** Severity helpers, ported from the former server pipeline. */

import { SEVERITY_ORDER, type Severity } from './types';

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function meetsMinSeverity(event: Severity, min: Severity): boolean {
  return severityRank(event) >= severityRank(min);
}

export function parseSeverity(raw: string | undefined | null): Severity {
  const s = (raw || 'info').toLowerCase();
  return (SEVERITY_ORDER as readonly string[]).includes(s) ? (s as Severity) : 'info';
}

/**
 * Whether a feed item's title marks the incident as resolved. AWS RSS keeps only
 * the latest state per incident and prefixes resolved titles with "Service is
 * operating normally:" / "[RESOLVED]"; the body is then a post-mortem full of
 * past-impact words ("elevated error rates", "was unavailable"). Detect from the
 * title only so the post-mortem body doesn't re-classify a fixed incident as an
 * active outage.
 */
export function isResolvedTitle(title: string): boolean {
  const t = title.toUpperCase();
  return t.includes('RESOLVED') || t.includes('OPERATING NORMALLY');
}

/** Guess severity from free-text status descriptions (AWS RSS, generic feeds). */
export function inferSeverityFromText(text: string): Severity {
  const t = text.toUpperCase();
  if (t.includes('OUTAGE') || t.includes('DOWN') || t.includes('UNAVAILABLE')) {
    return 'major';
  }
  if (t.includes('DEGRADED') || t.includes('ELEVATED') || t.includes('ERROR')) {
    return 'minor';
  }
  if (t.includes('MAINTENANCE') || t.includes('SCHEDULED')) {
    return 'maintenance';
  }
  if (t.includes('RESOLVED') || t.includes('OPERATIONAL')) {
    return 'info';
  }
  return 'info';
}
