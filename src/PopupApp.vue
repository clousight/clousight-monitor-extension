<template>
  <div
    data-testid="popup-root"
    class="box-border w-[360px] border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
  >
    <header class="mb-4 flex items-center justify-between gap-3">
      <AppBrand compact :subtitle="t('popup.tagline')" />
      <button
        type="button"
        data-testid="popup-dashboard"
        class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-primary-300 dark:hover:bg-slate-800"
        @click="openDashboard"
      >
        {{ t('popup.dashboard') }}
      </button>
    </header>

    <section
      class="mb-4 rounded-xl bg-gradient-to-br from-primary-800 to-primary-600 p-4 text-white"
      :aria-label="t('popup.overallStatus')"
    >
      <p class="text-xs text-primary-100">{{ t('popup.overallStatus') }}</p>
      <p class="mt-1 text-2xl font-bold">
        {{
          t('popup.healthyCount', {
            healthy: overallHealth.operational,
            total: overallHealth.total
          })
        }}
      </p>
      <p class="mt-1 text-xs text-primary-100">{{ issueSummary }}</p>
    </section>

    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {{ t('common.providers') }}
      </h2>
      <button
        type="button"
        class="min-h-[44px] rounded-md px-2 text-xs font-semibold text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:text-primary-300"
        :disabled="statusStore.loading"
        @click="refresh"
      >
        {{ statusStore.loading ? t('popup.refreshing') : t('popup.refresh') }}
      </button>
    </div>

    <p
      v-if="statusStore.loading && !hasRows"
      class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
    >
      {{ t('popup.loading') }}
    </p>
    <div
      v-else-if="statusStore.error && !hasRows"
      data-testid="popup-fatal-error"
      class="min-w-0 overflow-hidden break-words rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-800 dark:bg-warning-900/30 dark:text-warning-200"
    >
      <p>{{ statusStore.error }}</p>
      <button
        type="button"
        data-testid="popup-retry"
        class="mt-2 min-h-[44px] min-w-[44px] px-1 font-semibold underline"
        @click="refresh"
      >
        {{ t('popup.retry') }}
      </button>
    </div>
    <p
      v-else-if="!hasRows"
      class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
    >
      {{ t('popup.empty') }}
    </p>
    <ul v-else class="max-h-64 space-y-2 overflow-y-auto">
      <li
        v-for="row in providerSummaries"
        :key="row.id"
        data-testid="popup-row"
        class="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex min-h-[44px] items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <ProviderLogo :code="row.code" :name="row.name" />
            <span class="truncate text-xs font-semibold">{{ row.name }}</span>
          </div>
          <StatusBadge :status="row.worst" />
        </div>
        <div
          v-if="row.worst !== 'operational' && row.headline"
          class="mt-1.5 border-t border-slate-100 pt-1.5 dark:border-slate-800"
        >
          <p
            data-testid="incident-headline"
            class="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-400"
          >
            {{ row.headline }}
          </p>
          <p
            v-if="row.incidentStartTime"
            data-testid="incident-since"
            class="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500"
          >
            {{
              t('popup.ongoingSince', { since: formatElapsed(row.incidentStartTime, now, locale) })
            }}
          </p>
          <a
            v-if="row.incidentSourceUrl"
            data-testid="incident-link"
            :href="row.incidentSourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-0.5 inline-flex min-h-[44px] items-center text-[11px] font-semibold text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
          >
            {{ t('popup.officialDetails') }}
          </a>
        </div>
      </li>
    </ul>

    <p
      v-if="statusStore.error && hasRows"
      data-testid="popup-retained-warning"
      class="mt-3 min-w-0 overflow-hidden break-words rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-800 dark:bg-warning-900/30 dark:text-warning-200"
    >
      {{ statusStore.error }}
    </p>
    <div class="mt-3 space-y-2.5 border-t border-slate-200 pt-3 dark:border-slate-800">
      <!-- Last updated + auto-refresh -->
      <div class="flex items-center justify-between gap-3 text-[11px]">
        <span class="min-w-0 truncate text-slate-500">
          {{ t('common.lastUpdated') }} {{ lastUpdatedText }}
        </span>
        <label class="flex shrink-0 items-center gap-1.5">
          <span class="text-slate-400 dark:text-slate-500">{{ t('popup.autoRefresh') }}</span>
          <span class="relative inline-flex items-center">
            <select
              data-testid="popup-interval"
              :value="String(userStore.settings.checkInterval)"
              class="cursor-pointer appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2.5 pr-6 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600"
              @change="onIntervalChange"
            >
              <option v-for="n in intervalOptions" :key="n" :value="String(n)">
                {{ n }} {{ t('common.minutes') }}
              </option>
            </select>
            <svg
              class="pointer-events-none absolute right-1.5 h-3 w-3 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clip-rule="evenodd"
              />
            </svg>
          </span>
        </label>
      </div>

      <!-- Settings + language + meta -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            data-testid="popup-settings"
            class="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-md px-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300 dark:hover:bg-slate-800"
            @click="openOptions"
          >
            {{ t('popup.settings') }}
          </button>
          <span
            class="inline-flex items-center rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
          >
            <button
              v-for="opt in languageOptions"
              :key="opt.value"
              type="button"
              :data-testid="`popup-lang-${opt.value === 'zh-CN' ? 'zh' : 'en'}`"
              :aria-pressed="locale === opt.value"
              class="rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              :class="
                locale === opt.value
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              "
              @click="setLocale(opt.value)"
            >
              {{ opt.label }}
            </button>
          </span>
        </div>
        <div class="text-right text-[10px] leading-4 text-slate-400 dark:text-slate-500">
          <p>{{ t('popup.dataSource') }}</p>
          <p>{{ t('popup.version', { version }) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatElapsed } from '@/utils/elapsed';
import AppBrand from '@/components/AppBrand.vue';
import ProviderLogo from '@/components/ProviderLogo.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useStatusLastUpdated } from '@/composables/useStatusLastUpdated';
import { useStatusStore } from '@/stores/statusStore';
import { useUserStore } from '@/stores/userStore';
import { useProviderSubscription } from '@/composables/useProviderSubscription';
import { getExtensionVersion } from '@/utils/extensionMeta';
import { deriveOverallHealth, deriveProviderSummaries } from '@/utils/statusSummary';

const { t, locale } = useI18n();
const statusStore = useStatusStore();
const userStore = useUserStore();
const intervalOptions = [1, 5, 15, 30, 60];
// Captured once per popup open; the popup is short-lived so this stays accurate.
const now = ref(Date.now());

function onIntervalChange(event: Event) {
  const minutes = Number((event.target as HTMLSelectElement).value);
  void userStore.setCheckInterval(minutes);
}

// Quick language toggle (zh-CN / en). Finer control (incl. "auto") lives in Settings.
const languageOptions: Array<{ value: 'zh-CN' | 'en'; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'EN' }
];
function setLocale(value: 'zh-CN' | 'en') {
  userStore.setLocalePreference(value);
}
const lastUpdatedText = useStatusLastUpdated();
const { isWatched } = useProviderSubscription();
// Only surface providers the user actually watches (unwatched ones may still
// linger in cached status until the background next refetches).
const providerSummaries = computed(() =>
  deriveProviderSummaries(statusStore.services).filter(s => isWatched(s.code))
);
const overallHealth = computed(() => deriveOverallHealth(providerSummaries.value));
const version = getExtensionVersion();
const hasRows = computed(() => providerSummaries.value.length > 0);
const issueSummary = computed(() => {
  const affected = overallHealth.value.affected;
  if (affected === 0) return t('popup.allOperational');
  const key = affected === 1 ? 'popup.affectedCountSingular' : 'popup.affectedCount';
  return t(key, { count: affected });
});

async function refresh() {
  await statusStore.refreshStatus();
}

function openDashboard() {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create && chrome.runtime?.getURL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  }
}

function openOptions() {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
}

onMounted(() => {
  void statusStore.fetchStatus();
  // Load persisted settings so the auto-refresh selector reflects the saved interval.
  void userStore.loadSettings();
});
</script>
