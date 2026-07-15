<template>
  <div class="settings-page">
    <h2 class="page-title">{{ t('settings.title') }}</h2>

    <div v-if="loading" class="loading">{{ t('settings.loading') }}</div>

    <form v-else class="settings-form" @submit.prevent="save">
      <!-- Language -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.localeSection') }}</h3>
        <p class="section-description">{{ t('settings.localeHelp') }}</p>
        <div class="form-group">
          <label for="locale-pref" class="form-label">{{ t('settings.localeSection') }}</label>
          <select id="locale-pref" v-model="localeChoice" class="form-input max-w-md">
            <option value="auto">{{ t('settings.localeAuto') }}</option>
            <option v-for="opt in localeOptions" :key="opt.code" :value="opt.code">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </section>

      <!-- General -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.general') }}</h3>

        <div class="form-group">
          <label for="check-interval" class="form-label">{{ t('settings.checkInterval') }}</label>
          <div class="flex items-center">
            <input
              id="check-interval"
              v-model.number="settings.checkInterval"
              type="number"
              min="1"
              max="60"
              class="form-input w-20"
            />
            <span class="ml-2 text-sm text-slate-500">{{ t('common.minutes') }}</span>
          </div>
          <p class="form-help">{{ t('settings.checkHelp') }}</p>
        </div>

        <div class="form-group">
          <div class="flex items-center">
            <input
              id="startup-check"
              v-model="settings.checkOnStartup"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="startup-check" class="ml-2">{{ t('settings.startupCheck') }}</label>
          </div>
        </div>
      </section>

      <!-- Cloud providers -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.cloudProviders') }}</h3>
        <p class="section-description">{{ t('settings.cloudProvidersDesc') }}</p>
        <div class="provider-options">
          <label v-for="p in allProviders" :key="p.code" class="provider-item">
            <input
              type="checkbox"
              class="form-checkbox"
              :checked="isProviderEnabled(p.code)"
              @change="toggleProvider(p.code)"
            />
            <span class="provider-name">{{ p.name }}</span>
            <span v-if="p.experimental" class="exp-badge">{{ t('settings.experimental') }}</span>
          </label>
        </div>
      </section>

      <!-- Notifications -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.notifications') }}</h3>

        <div class="form-group">
          <div class="flex items-center">
            <input
              id="enable-notifications"
              v-model="settings.notifications.enabled"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="enable-notifications" class="ml-2">
              {{ t('settings.enableNotifications') }}
            </label>
          </div>
        </div>

        <div v-if="settings.notifications.enabled" class="form-group">
          <div class="flex items-center">
            <input
              id="channel-browser"
              v-model="settings.notifications.browser"
              type="checkbox"
              class="form-checkbox"
            />
            <label for="channel-browser" class="ml-2">
              {{ t('settings.browserNotifications') }}
            </label>
          </div>
          <p class="form-help">
            {{ t('settings.notifyRulesHint') }}
            <router-link to="/subscriptions" class="text-primary-600 hover:underline">
              {{ t('nav.subscriptions') }}
            </router-link>
          </p>
        </div>
      </section>

      <!-- AI briefings (optional, bring-your-own-key) -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.aiSection') }}</h3>
        <p class="section-description">{{ t('settings.aiHelp') }}</p>

        <div class="form-group">
          <label class="form-label" for="ai-base">{{ t('settings.aiBaseUrl') }}</label>
          <input
            id="ai-base"
            v-model="llm.baseUrl"
            type="url"
            class="form-input w-full max-w-lg"
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="ai-model">{{ t('settings.aiModel') }}</label>
          <input
            id="ai-model"
            v-model="llm.model"
            type="text"
            class="form-input w-full max-w-md"
            placeholder="gpt-4o-mini"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="ai-key">{{ t('settings.aiApiKey') }}</label>
          <input
            id="ai-key"
            v-model="llm.apiKey"
            type="password"
            autocomplete="off"
            class="form-input w-full max-w-lg"
          />
          <p class="form-help">{{ t('settings.aiKeyLocalNote') }}</p>
        </div>
      </section>

      <!-- About -->
      <section class="settings-section">
        <h3 class="section-title">{{ t('settings.aboutTitle') }}</h3>
        <div class="about-info">
          <p class="mb-1">{{ t('settings.version') }} 0.1.0</p>
          <p>© 2026 Clousight</p>
          <p class="mt-1 text-xs text-slate-500">{{ t('settings.privacyNote') }}</p>
        </div>
      </section>

      <!-- Save -->
      <div class="form-actions">
        <div v-if="saveSuccess" class="save-success">
          <span class="check-icon">✓</span> {{ t('settings.saved') }}
        </div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? t('common.saving') : t('settings.saveBtn') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import type { LocalePreference } from '@/utils/detectLocale';
import { getLlmConfig, saveLlmConfig, DEFAULT_LLM_CONFIG, type LlmConfig } from '@/services/llm';
import { PROVIDERS, getProvider } from '@/services/providers/registry';
import { requestProviderOrigin, removeProviderOrigin } from '@/services/permissions';

const { t } = useI18n();
const userStore = useUserStore();

const loading = ref(true);
const saving = ref(false);
const saveSuccess = ref(false);
const llm = ref<LlmConfig>({ ...DEFAULT_LLM_CONFIG });

const isExtension =
  typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && !!chrome.runtime?.id;

// Bind the form directly to the single settings store.
const settings = computed(() => userStore.settings);

const allProviders = PROVIDERS;

function isProviderEnabled(code: string): boolean {
  return userStore.settings.providers.includes(code);
}

async function toggleProvider(code: string): Promise<void> {
  const list = userStore.settings.providers;
  if (list.includes(code)) {
    userStore.settings.providers = list.filter(c => c !== code);
    void removeProviderOrigin(code);
    return;
  }
  // Experimental providers need on-demand host permission (requested here, from
  // the checkbox's user gesture). If the user declines, don't enable.
  if (getProvider(code)?.experimental) {
    const granted = await requestProviderOrigin(code);
    if (!granted) {
      return;
    }
  }
  userStore.settings.providers = [...list, code];
}

const localeChoice = computed({
  get: (): LocalePreference => userStore.settings.localePreference,
  set: (v: LocalePreference) => userStore.setLocalePreference(v)
});

// Native language names (language names are conventionally not translated).
const localeOptions = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '简体中文' },
  { code: 'zh-Hant', label: '繁體中文' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt-BR', label: 'Português (Brasil)' }
];

onMounted(async () => {
  if (!userStore.isInitialized) {
    await userStore.initialize();
  } else {
    await userStore.loadSettings();
  }
  llm.value = await getLlmConfig();
  loading.value = false;
});

async function save(): Promise<void> {
  saving.value = true;
  saveSuccess.value = false;
  try {
    await userStore.saveSettings();
    await saveLlmConfig(llm.value);
    if (isExtension) {
      chrome.runtime.sendMessage({
        action: 'updateCheckInterval',
        interval: userStore.settings.checkInterval
      });
    }
    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Error saving settings:', error);
    alert(t('settings.saveFailed'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.settings-page {
  @apply flex flex-col;
}

.page-title {
  @apply text-lg font-semibold mb-4;
}

.loading {
  @apply flex items-center justify-center py-10 text-slate-500;
}

.settings-form {
  @apply space-y-6;
}

.settings-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.section-title {
  @apply text-base font-medium mb-2 text-slate-800 dark:text-slate-100;
}

.section-description {
  @apply text-sm text-slate-500 mb-3;
}

.form-group {
  @apply mb-4 last:mb-0;
}

.form-label {
  @apply block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1;
}

.form-input {
  @apply block border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm;
}

.form-checkbox {
  @apply h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded;
}

.form-help {
  @apply mt-1 text-xs text-slate-500;
}

.provider-options {
  @apply grid grid-cols-1 sm:grid-cols-2 gap-2;
}

.provider-item {
  @apply flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300;
}

.provider-name {
  @apply flex-1;
}

.exp-badge {
  @apply text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200;
}

.btn {
  @apply inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors duration-200;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50;
}

.form-actions {
  @apply flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700;
}

.save-success {
  @apply flex items-center text-sm text-success-600 mr-auto;
}

.check-icon {
  @apply mr-1;
}

.about-info {
  @apply text-sm text-slate-600 dark:text-slate-400;
}
</style>
