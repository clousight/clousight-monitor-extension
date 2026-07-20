<template>
  <div class="providers-page">
    <div class="page-header">
      <div class="header-titles">
        <h1 class="page-title">{{ t('providers.title') }}</h1>
        <p class="last-checked">{{ t('providers.lastChecked') }} {{ lastCheckedText }}</p>
      </div>

      <div class="actions">
        <button class="btn btn-outline" :disabled="loading" @click="refreshStatus">
          <AppIcon name="refresh" class="material-icons" />
          <span v-if="loading">{{ t('common.refreshing') }}</span>
          <span v-else>{{ t('common.refresh') }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !hasAnyStatusRows" class="loading-state">
      <div class="loading-spinner"></div>
      <span>{{ t('providers.loading') }}</span>
    </div>

    <div v-else-if="storeError && !hasAnyStatusRows" class="empty-state">
      <AppIcon name="cloud_off" class="empty-icon-glyph" />
      <p class="empty-message">{{ t('common.serviceUnavailable') }}</p>
      <p class="empty-detail">{{ storeError }}</p>
      <button type="button" class="btn btn-outline" @click="refreshStatus">
        {{ t('common.refresh') }}
      </button>
    </div>

    <div
      v-else-if="providerCards.length === 0 && unwatchedProviders.length === 0"
      class="empty-state"
    >
      <AppIcon name="cloud_off" class="empty-icon-glyph" />
      <p class="empty-message">{{ t('dashboard.statusUnavailable') }}</p>
      <button type="button" class="btn btn-outline" @click="refreshStatus">
        {{ t('common.refresh') }}
      </button>
    </div>

    <template v-else>
      <!-- Add providers you don't currently watch -->
      <div v-if="unwatchedProviders.length" class="unwatched-bar">
        <span class="unwatched-label">{{ t('providers.watchMore') }}</span>
        <button
          v-for="p in unwatchedProviders"
          :key="p.code"
          type="button"
          class="watch-chip"
          data-testid="watch-chip"
          @click="onToggle(p.code)"
        >
          <span aria-hidden="true">+</span> {{ p.name }}
        </button>
      </div>

      <div v-if="providerCards.length" class="providers-grid">
        <div v-for="provider in providerCards" :key="provider.id" class="provider-card">
          <div class="card-header">
            <div class="provider-heading">
              <ProviderLogo :code="provider.code" :name="provider.name" size="md" />
              <h2 class="provider-name">{{ provider.name }}</h2>
            </div>
            <StatusBadge :status="provider.worst" />
          </div>

          <div class="card-body">
            <p
              v-if="provider.active > 0"
              class="card-summary card-summary-active"
              data-testid="provider-active"
            >
              {{ activeText(provider.active) }}
            </p>
            <p v-else class="card-summary card-summary-ok" data-testid="provider-ok">
              {{ t('providers.allNormal') }}
            </p>
            <p v-if="provider.resolved > 0" class="card-resolved" data-testid="provider-resolved">
              {{ resolvedText(provider.resolved) }}
            </p>
          </div>

          <p class="card-checked" data-testid="card-checked">
            {{ t('providers.lastChecked') }} {{ providerCheckedText(provider.code) }}
          </p>

          <div class="card-footer">
            <button
              type="button"
              class="btn btn-outline btn-sm unwatch-btn"
              data-testid="unwatch-btn"
              @click="onToggle(provider.code)"
            >
              {{ t('providers.unwatch') }}
            </button>
            <a
              v-if="provider.statusPageUrl"
              :href="provider.statusPageUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-outline btn-sm"
            >
              {{ t('common.officialStatus') }}
            </a>
            <router-link :to="`/providers/${provider.id}`" class="btn btn-outline btn-sm">
              {{ t('common.viewDetails') }}
            </router-link>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';
import AppIcon from '@/components/AppIcon.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import ProviderLogo from '@/components/ProviderLogo.vue';
import { useStatusLastUpdated } from '@/composables/useStatusLastUpdated';
import { useProviderSubscription } from '@/composables/useProviderSubscription';
import { deriveProviderSummaries } from '@/utils/statusSummary';
import { PROVIDERS } from '@/services/providers/registry';

const { t, locale } = useI18n();
const statusStore = useStatusStore();
const lastCheckedText = useStatusLastUpdated();
const { isWatched, toggle } = useProviderSubscription();
const loading = ref(true);

// Providers not currently watched — offered as quick "add" chips so the user can
// choose to monitor only the ones they care about without leaving this page.
const unwatchedProviders = computed(() => PROVIDERS.filter(p => !isWatched(p.code)));

/** Watch/unwatch a provider, then refresh so the change is reflected immediately. */
async function onToggle(code: string): Promise<void> {
  await toggle(code);
  await refreshStatus();
}

function activeText(count: number): string {
  const key = count === 1 ? 'providers.activeEventSingular' : 'providers.activeEvents';
  return t(key, { count });
}

function resolvedText(count: number): string {
  const key = count === 1 ? 'providers.resolvedSingular' : 'providers.resolvedCount';
  return t(key, { count });
}

/**
 * Per-provider last-checked time. A provider advances only when its own fetch
 * succeeds, so a failing provider correctly shows an older time than the rest;
 * providers without a recorded time yet fall back to the global last-updated.
 */
function providerCheckedText(code: string): string {
  const ts = statusStore.providerCheckedAt[code];
  if (!ts) {
    return lastCheckedText.value;
  }
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(ts));
}

const hasAnyStatusRows = computed(() => statusStore.services.length > 0);
const storeError = computed(() => statusStore.error);

// Initialize and fetch status data
onMounted(async () => {
  try {
    await statusStore.fetchStatus();
  } catch (error) {
    console.error('Failed to fetch status data:', error);
  } finally {
    loading.value = false;
  }
});

// Refresh status data
async function refreshStatus() {
  loading.value = true;
  try {
    await statusStore.refreshStatus();
  } finally {
    loading.value = false;
  }
}

// Provider cards data — only for watched providers. Filtering on the watch list
// (not just whatever is in the store) makes unwatch take effect immediately and
// hides any stale rows left over from a previous fetch, independent of when the
// background next refetches.
const providerCards = computed(() =>
  deriveProviderSummaries(statusStore.services).filter(s => isWatched(s.code))
);
</script>

<style scoped>
@reference '../assets/tailwind.css';

.providers-page {
  @apply space-y-6;
}

.page-header {
  @apply flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4;
}

.page-title {
  @apply text-2xl font-bold text-slate-800 dark:text-slate-100;
}

.actions {
  @apply flex items-center gap-2;
}

.btn {
  @apply inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
}

.btn-outline {
  @apply border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700;
}

.btn-sm {
  @apply px-3 py-1.5 text-xs;
}

.material-icons {
  @apply text-lg;
}

.loading-state {
  @apply flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-slate-300 dark:border-slate-600 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mb-2;
}

.providers-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
}

.provider-card {
  @apply bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden;
}

.card-header {
  @apply flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700;
}

.header-titles {
  @apply flex flex-col gap-1;
}

.last-checked {
  @apply text-xs text-slate-500 dark:text-slate-400;
}

.provider-heading {
  @apply flex items-center gap-2 min-w-0;
}

.provider-name {
  @apply text-lg font-medium text-slate-800 dark:text-slate-200 truncate;
}

.card-checked {
  @apply px-4 pb-1 text-xs text-slate-400 dark:text-slate-500;
}

.status-operational {
  @apply text-green-700 dark:text-green-400;
}

.status-degraded {
  @apply text-yellow-600 dark:text-yellow-400;
}

.status-outage {
  @apply text-red-600 dark:text-red-400;
}

.status-maintenance {
  @apply text-blue-600 dark:text-blue-400;
}

.card-body {
  @apply p-4 space-y-1;
}

.card-footer {
  @apply p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex flex-wrap justify-end gap-2;
}

.card-summary {
  @apply text-sm font-medium;
}

.card-summary-active {
  @apply text-warning-700 dark:text-warning-300;
}

.card-summary-ok {
  @apply text-success-700 dark:text-success-400;
}

.card-resolved {
  @apply mt-1 text-xs text-slate-500 dark:text-slate-400;
}

.unwatch-btn {
  @apply mr-auto;
}

.unwatched-bar {
  @apply flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 p-3;
}

.unwatched-label {
  @apply text-xs font-medium text-slate-500 dark:text-slate-400;
}

.watch-chip {
  @apply inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-primary-400 hover:text-primary-700 dark:hover:text-primary-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors;
}

.empty-state {
  @apply flex flex-col items-center justify-center py-16 px-4 text-center text-slate-600 dark:text-slate-400;
}

.empty-state .empty-icon-glyph {
  @apply text-5xl text-slate-400 dark:text-slate-500 mb-4;
}

.empty-message {
  @apply max-w-md mb-2 text-sm;
}

.empty-detail {
  @apply max-w-md mb-6 text-xs text-slate-500 dark:text-slate-400 break-words;
}
</style>
