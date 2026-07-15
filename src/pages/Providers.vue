<template>
  <div class="providers-page">
    <div class="page-header">
      <h1 class="page-title">{{ t('providers.title') }}</h1>

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

    <div v-else-if="providerCards.length === 0" class="empty-state">
      <AppIcon name="cloud_off" class="empty-icon-glyph" />
      <p class="empty-message">{{ t('dashboard.statusUnavailable') }}</p>
      <button type="button" class="btn btn-outline" @click="refreshStatus">
        {{ t('common.refresh') }}
      </button>
    </div>

    <div v-else class="providers-grid">
      <div v-for="provider in providerCards" :key="provider.id" class="provider-card">
        <div class="card-header">
          <h2 class="provider-name">{{ provider.name }}</h2>
          <div class="status-indicator" :class="getStatusClass(provider.overall)">
            {{ formatStatus(provider.overall) }}
          </div>
        </div>

        <div class="card-body">
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">{{ t('providers.statusRows') }}</span>
              <span class="stat-value">{{ provider.total }}</span>
            </div>

            <div class="stat-item">
              <span class="stat-label">{{ t('providers.regionsLabel') }}</span>
              <span class="stat-value">{{ provider.regions }}</span>
            </div>
          </div>

          <div class="status-row">
            <div class="status-item status-operational">
              <span class="value">{{ provider.status.operational }}</span>
              <span class="label">{{ t('common.operational') }}</span>
            </div>

            <div class="status-item status-degraded">
              <span class="value">{{ provider.status.degraded }}</span>
              <span class="label">{{ t('common.degraded') }}</span>
            </div>

            <div class="status-item status-outage">
              <span class="value">{{ provider.status.outage }}</span>
              <span class="label">{{ t('common.outage') }}</span>
            </div>

            <div class="status-item status-maintenance">
              <span class="value">{{ provider.status.maintenance }}</span>
              <span class="label">{{ t('common.maintenance') }}</span>
            </div>
          </div>
        </div>

        <div class="card-footer">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';
import { StatusType } from '@/types/status';
import AppIcon from '@/components/AppIcon.vue';
import { getProvider } from '@/services/providers/registry';

const { t } = useI18n();
const statusStore = useStatusStore();
const loading = ref(true);

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

// Provider cards data
const providerCards = computed(() => {
  // Use unfiltered services: this page has no filter UI, so it must not inherit
  // a filter set elsewhere (e.g. the Dashboard).
  const services = statusStore.services;
  const providers = new Map();

  // Group services by provider
  services.forEach(service => {
    const providerId = service.provider.toLowerCase();

    if (!providers.has(providerId)) {
      providers.set(providerId, {
        id: providerId,
        name: service.provider,
        total: 0,
        regions: new Set(),
        status: {
          operational: 0,
          degraded: 0,
          outage: 0,
          maintenance: 0
        },
        overall: 'operational' as StatusType
      });
    }

    const provider = providers.get(providerId);
    provider.total++;
    provider.regions.add(service.regionId || service.region);
    provider.status[service.status]++;

    // Update overall status (prioritize worst status)
    if (
      service.status === 'outage' ||
      (service.status === 'degraded' && provider.overall !== 'outage') ||
      (service.status === 'maintenance' && provider.overall === 'operational')
    ) {
      provider.overall = service.status;
    }
  });

  // Convert to array, add region count and the provider's official status-page URL
  return Array.from(providers.values()).map(provider => {
    return {
      ...provider,
      regions: provider.regions.size,
      statusPageUrl: getProvider(provider.id)?.statusPageUrl
    };
  });
});

// Get CSS class for status
function getStatusClass(status: StatusType): string {
  return `status-${status}`;
}

// Format status for display
function formatStatus(status: StatusType): string {
  const map: Record<StatusType, string> = {
    operational: 'operational',
    degraded: 'degraded',
    outage: 'outage',
    maintenance: 'maintenance'
  };
  const k = map[status] ?? 'unknown';
  return t(`status.overall.${k}`);
}
</script>

<style scoped>
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

.provider-name {
  @apply text-lg font-medium text-slate-800 dark:text-slate-200;
}

.status-indicator {
  @apply px-2 py-1 text-xs font-medium rounded-full;
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
  @apply p-4;
}

.stats-row {
  @apply flex justify-between mb-4;
}

.stat-item {
  @apply flex flex-col;
}

.stat-label {
  @apply text-xs text-slate-500 dark:text-slate-400;
}

.stat-value {
  @apply text-lg font-medium text-slate-800 dark:text-slate-200;
}

.status-row {
  @apply grid grid-cols-2 gap-2;
}

.status-item {
  @apply flex flex-col items-center p-2 rounded bg-slate-50 dark:bg-slate-700/50;
}

.status-item .value {
  @apply text-lg font-medium;
}

.status-item .label {
  @apply text-xs text-slate-500 dark:text-slate-400;
}

.card-footer {
  @apply p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 flex justify-end gap-2;
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
