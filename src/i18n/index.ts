import { createI18n } from 'vue-i18n';
import type { App } from 'vue';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import zhHant from './locales/zh-Hant.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import {
  applyDocumentLang,
  resolveLocalePreference,
  type LocalePreference,
  type SupportedLocale
} from '@/utils/detectLocale';

/** Narrow shape so dynamic `t(key)` call sites avoid vue-i18n TS2589 depth limits. */
export type CloudNorthI18n = {
  install: (app: App, ...options: unknown[]) => void;
  global: {
    locale: { value: string };
    t: (key: string) => unknown;
  };
};

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    'zh-Hant': zhHant,
    de,
    es,
    fr,
    ja,
    ko,
    'pt-BR': ptBR
  }
}) as unknown as CloudNorthI18n;

export function translateRouteTitle(key: string): string {
  return String(i18n.global.t(key));
}

export function setGlobalLocale(
  pref: LocalePreference | string | null | undefined
): SupportedLocale {
  const resolved = resolveLocalePreference(pref ?? 'auto');
  i18n.global.locale.value = resolved;
  applyDocumentLang(resolved);
  return resolved;
}
