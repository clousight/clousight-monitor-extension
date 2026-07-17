/**
 * User preferences store (settings, theme, locale, integrations).
 * Clousight has no account/auth — everything here is local to the browser.
 */

import { defineStore } from 'pinia';
import { setGlobalLocale } from '@/i18n';
import type { LocalePreference } from '@/utils/detectLocale';
import { migrateLegacyLocaleCode, SUPPORTED_LOCALES } from '@/utils/detectLocale';
import { VERIFIED_PROVIDERS } from '@/services/providers/registry';
import { applyThemeClass, resolveTheme, type ThemePreference } from '@/utils/themeBootstrap';

interface UserSettings {
  /** UI language: auto follows Chrome UI / browser language. */
  localePreference: LocalePreference;
  theme: ThemePreference;
  /** How often the background worker polls provider status, in minutes. */
  checkInterval: number;
  /** Run a status check when the browser/extension starts. */
  checkOnStartup: boolean;
  /** Enabled provider codes to fetch/monitor (e.g. ["AWS","GCP"]). */
  providers: string[];
  notifications: {
    /** Master switch for browser notifications. */
    enabled: boolean;
    browser: boolean;
  };
  filters: {
    defaultFilter: string | null;
    savedFilters: unknown[];
  };
  integrations: {
    slack: { enabled: boolean; webhookUrl: string };
    teams: { enabled: boolean; webhookUrl: string };
    discord: { enabled: boolean; webhookUrl: string };
    dingtalk: { enabled: boolean; webhookUrl: string };
    feishu: { enabled: boolean; webhookUrl: string };
  };
}

interface UserState {
  /** True after `initialize()` has finished (success or no-op). */
  isInitialized: boolean;
  settings: UserSettings;
}

// Module-level (not per-store-instance) on purpose: each extension surface
// (popup, options page, dashboard tab) loads this module fresh in its own
// document/JS realm, so there is only ever one store — and one listener —
// per module lifetime. This assumption breaks only if the app starts creating
// multiple Pinia app instances within a single page; if that ever happens,
// move this into `startSystemThemeSync`/`stopSystemThemeSync` state instead
// of sharing it across instances.
const systemThemeMedia =
  typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)');
let systemThemeChangeListener: (() => void) | null = null;

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isInitialized: false,
    settings: {
      localePreference: 'auto',
      theme: 'light',
      checkInterval: 5,
      checkOnStartup: true,
      providers: VERIFIED_PROVIDERS.map(p => p.code),
      notifications: {
        enabled: true,
        browser: true
      },
      filters: {
        defaultFilter: null,
        savedFilters: []
      },
      integrations: {
        slack: { enabled: false, webhookUrl: '' },
        teams: { enabled: false, webhookUrl: '' },
        discord: { enabled: false, webhookUrl: '' },
        dingtalk: { enabled: false, webhookUrl: '' },
        feishu: { enabled: false, webhookUrl: '' }
      }
    }
  }),

  getters: {
    /** Effective theme based on settings and system preference. */
    effectiveTheme: (state): 'light' | 'dark' =>
      resolveTheme(state.settings.theme, systemThemeMedia?.matches ?? false)
  },

  actions: {
    async initialize() {
      await this.loadSettings();
      this.applyTheme();
      this.startSystemThemeSync();
      this.isInitialized = true;
    },

    async loadSettings() {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise<void>(resolve => {
          chrome.storage.sync.get(['settings', 'cnLocale'], data => {
            if (data.settings) {
              this.settings = { ...this.settings, ...data.settings };
            }
            this.normalizeLocalePreferenceState();
            const loc =
              typeof data.cnLocale === 'string'
                ? migrateLegacyLocaleCode(data.cnLocale)
                : undefined;
            if (loc === 'auto' || (loc && (SUPPORTED_LOCALES as readonly string[]).includes(loc))) {
              this.settings.localePreference = loc as LocalePreference;
            }
            resolve();
          });
        });
      }
      const settings = localStorage.getItem('settings');
      if (settings) {
        try {
          this.settings = JSON.parse(settings);
        } catch (e) {
          console.error('Failed to parse settings:', e);
        }
      }
      this.normalizeLocalePreferenceState();
      const cnRaw = localStorage.getItem('cnLocale');
      const cn = cnRaw ? migrateLegacyLocaleCode(cnRaw) : null;
      if (cn === 'auto' || (cn && (SUPPORTED_LOCALES as readonly string[]).includes(cn))) {
        this.settings.localePreference = cn as LocalePreference;
      }
    },

    normalizeLocalePreferenceState() {
      const raw = String(this.settings.localePreference);
      const migrated = migrateLegacyLocaleCode(raw);
      if (migrated === 'auto' || (SUPPORTED_LOCALES as readonly string[]).includes(migrated)) {
        this.settings.localePreference = migrated as LocalePreference;
      } else {
        this.settings.localePreference = 'auto';
      }
    },

    async saveSettings() {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>(resolve => {
          chrome.storage.sync.set(
            { settings: this.settings, cnLocale: this.settings.localePreference },
            resolve
          );
        });
      } else {
        localStorage.setItem('settings', JSON.stringify(this.settings));
        localStorage.setItem('cnLocale', this.settings.localePreference);
      }
      this.applyTheme();
    },

    applyTheme() {
      applyThemeClass(this.settings.theme);
    },

    startSystemThemeSync() {
      if (!systemThemeMedia || systemThemeChangeListener) {
        return;
      }
      systemThemeChangeListener = () => this.applyTheme();
      systemThemeMedia.addEventListener('change', systemThemeChangeListener);
    },

    stopSystemThemeSync() {
      if (!systemThemeMedia || !systemThemeChangeListener) {
        return;
      }
      systemThemeMedia.removeEventListener('change', systemThemeChangeListener);
      systemThemeChangeListener = null;
    },

    setTheme(theme: ThemePreference) {
      this.settings.theme = theme;
      this.applyTheme();
      void this.saveSettings();
    },

    setLocalePreference(pref: LocalePreference) {
      this.settings.localePreference = pref;
      setGlobalLocale(pref);
      void this.saveSettings();
    },

    updateNotificationSettings(settings: { browser?: boolean }) {
      if (settings.browser !== undefined) {
        this.settings.notifications.browser = settings.browser;
      }
      void this.saveSettings();
    },

    configureIntegration(
      name: keyof UserState['settings']['integrations'],
      config: { enabled?: boolean; webhookUrl?: string }
    ) {
      if (!this.settings.integrations[name]) {
        return;
      }
      this.settings.integrations[name] = { ...this.settings.integrations[name], ...config };
      void this.saveSettings();
    }
  }
});
