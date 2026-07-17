<template>
  <div
    class="w-[360px] border border-slate-200 bg-slate-50 p-4 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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
        class="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <span class="truncate text-xs font-semibold">{{ row.name }}</span>
        <StatusBadge :status="row.worst" />
      </li>
    </ul>

    <p
      v-if="statusStore.error && hasRows"
      data-testid="popup-retained-warning"
      class="mt-3 min-w-0 overflow-hidden break-words rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-800 dark:bg-warning-900/30 dark:text-warning-200"
    >
      {{ statusStore.error }}
    </p>
    <p class="mt-3 text-[11px] text-slate-500">
      {{ t('common.lastUpdated') }} {{ lastUpdatedText }}
    </p>
    <footer
      class="mt-3 flex items-end justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800"
    >
      <button
        type="button"
        data-testid="popup-settings"
        class="min-h-[44px] min-w-[44px] rounded-md px-1 text-xs text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-300"
        @click="openOptions"
      >
        {{ t('popup.settings') }}
      </button>
      <div class="text-right text-[10px] leading-4 text-slate-500">
        <p>{{ t('popup.dataSource') }}</p>
        <p>{{ t('popup.version', { version }) }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import AppBrand from '@/components/AppBrand.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useStatusLastUpdated } from '@/composables/useStatusLastUpdated';
import { useStatusStore } from '@/stores/statusStore';
import { getExtensionVersion } from '@/utils/extensionMeta';
import { deriveOverallHealth, deriveProviderSummaries } from '@/utils/statusSummary';

const { t } = useI18n();
const statusStore = useStatusStore();
const lastUpdatedText = useStatusLastUpdated();
const providerSummaries = computed(() => deriveProviderSummaries(statusStore.services));
const overallHealth = computed(() => deriveOverallHealth(providerSummaries.value));
const version = getExtensionVersion();
const hasRows = computed(() => providerSummaries.value.length > 0);
const issueSummary = computed(() =>
  overallHealth.value.affected === 0
    ? t('popup.allOperational')
    : t('popup.affectedCount', { count: overallHealth.value.affected })
);

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
});
</script>
