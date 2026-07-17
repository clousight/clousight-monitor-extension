/**
 * Supported UI locales. Auto mode maps the browser/Chrome UI language to the
 * closest supported locale, falling back to English.
 */

export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalePreference = 'auto' | SupportedLocale;

/** Maps a BCP-47-ish tag to the closest supported locale, or null if none. */
function normalizeTagToLocale(tag: string): SupportedLocale | null {
  const lower = tag.toLowerCase().replace(/_/g, '-');
  if (lower.startsWith('zh')) {
    return 'zh-CN';
  }
  if (lower.startsWith('en')) {
    return 'en';
  }
  return null;
}

/** Maps a stored or legacy code to `auto` or a supported locale. */
export function migrateLegacyLocaleCode(code: string): string {
  const c = code.trim();
  if (!c || c === 'auto') {
    return 'auto';
  }
  const normalized = c.replace(/_/g, '-');
  const exact = (SUPPORTED_LOCALES as readonly string[]).find(
    l => l.toLowerCase() === normalized.toLowerCase()
  );
  if (exact) {
    return exact;
  }
  return normalizeTagToLocale(normalized) ?? 'en';
}

export function getChromeExtensionUILanguage(): string | undefined {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
      return chrome.i18n.getUILanguage();
    }
  } catch {
    /* non-extension or restricted context */
  }
  return undefined;
}

export function detectBrowserLocale(): SupportedLocale {
  const chromeUi = getChromeExtensionUILanguage();
  const candidates = [
    chromeUi,
    ...(typeof navigator !== 'undefined' ? navigator.languages : []),
    typeof navigator !== 'undefined' ? navigator.language : undefined
  ].filter((x): x is string => Boolean(x));

  for (const raw of candidates) {
    const resolved = normalizeTagToLocale(raw);
    if (resolved) {
      return resolved;
    }
  }
  return 'en';
}

export function resolveLocalePreference(
  pref: LocalePreference | string | undefined | null
): SupportedLocale {
  if (pref === undefined || pref === null || pref === '' || pref === 'auto') {
    return detectBrowserLocale();
  }
  const migrated = migrateLegacyLocaleCode(pref as string);
  if (migrated === 'auto') {
    return detectBrowserLocale();
  }
  if ((SUPPORTED_LOCALES as readonly string[]).includes(migrated)) {
    return migrated as SupportedLocale;
  }
  return detectBrowserLocale();
}

export function applyDocumentLang(locale: SupportedLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale);
  }
}
