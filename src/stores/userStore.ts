/**
 * User preferences store (settings, theme, locale, integrations).
 * Clousight has no account/auth — everything here is local to the browser.
 */

import { defineStore } from 'pinia';
import { setGlobalLocale } from '@/i18n';
import type { LocalePreference } from '@/utils/detectLocale';
import { migrateLegacyLocaleCode, SUPPORTED_LOCALES } from '@/utils/detectLocale';
import { VERIFIED_PROVIDERS } from '@/services/providers/registry';
import type { Severity } from '@/services/providers/types';
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
    /** Only notify for incidents at or above this severity. */
    minSeverity: Severity;
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
        browser: true,
        minSeverity: 'major'
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
            this.normalizeNotificationsState();
            this.normalizeProvidersState();
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
      this.normalizeNotificationsState();
      this.normalizeProvidersState();
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

    /** Backfill notification defaults for settings saved before a field existed. */
    normalizeNotificationsState() {
      const n = this.settings.notifications;
      if (!n || typeof n !== 'object') {
        this.settings.notifications = { enabled: true, browser: true, minSeverity: 'major' };
        return;
      }
      if (n.minSeverity === undefined) {
        n.minSeverity = 'major';
      }
    },

    /**
     * Recover the watched-providers list from legacy/corrupted persisted data.
     * Older settings stored this differently, so a non-array value can survive
     * in chrome.storage; callers do `providers.includes(code)`, which throws on a
     * non-array. Coerce to a clean string array (defaulting to verified providers).
     */
    normalizeProvidersState() {
      const p = this.settings.providers as unknown;
      if (!Array.isArray(p)) {
        this.settings.providers = VERIFIED_PROVIDERS.map(x => x.code);
        return;
      }
      this.settings.providers = p.filter((c): c is string => typeof c === 'string');
    },

    async saveSettings() {
      // Detach from Vue's reactive proxy: chrome.storage.set structured-clones its
      // argument, and a Proxy throws DataCloneError, which would silently drop the
      // write (settings never persist across reloads/updates). Persist a plain copy.
      const plain = JSON.parse(JSON.stringify(this.settings));
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.sync.set({ settings: plain, cnLocale: plain.localePreference }, () => {
            const err = chrome.runtime?.lastError;
            if (err) {
              reject(new Error(err.message));
            } else {
              resolve();
            }
          });
        });
      } else {
        localStorage.setItem('settings', JSON.stringify(plain));
        localStorage.setItem('cnLocale', plain.localePreference);
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

    /**
     * Set how often the background worker polls provider status. Clamps to the
     * 1–60 minute window (matching the Settings page input), persists locally,
     * and asks the background worker to reschedule its alarm immediately so the
     * change takes effect without waiting for the next tick.
     */
    async setCheckInterval(minutes: number) {
      const clamped = Math.min(60, Math.max(1, Math.round(minutes)));
      this.settings.checkInterval = clamped;
      await this.saveSettings();
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: 'updateCheckInterval', interval: clamped });
      }
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
