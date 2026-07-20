/**
 * Locale-aware "time ago" formatting for incident durations, using the platform
 * Intl.RelativeTimeFormat so no per-locale strings are needed. Picks the largest
 * sensible unit and floors sub-minute gaps to one minute (a just-started incident
 * reads "1 minute ago" rather than a jittery seconds count).
 */
export function formatElapsed(fromMs: number, nowMs: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  const seconds = Math.max(60, Math.round((nowMs - fromMs) / 1000));
  if (seconds < 3600) {
    return rtf.format(-Math.floor(seconds / 60), 'minute');
  }
  if (seconds < 86_400) {
    return rtf.format(-Math.floor(seconds / 3600), 'hour');
  }
  return rtf.format(-Math.floor(seconds / 86_400), 'day');
}
