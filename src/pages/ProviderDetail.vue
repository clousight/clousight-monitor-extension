<template>
  <div class="provider-detail-page">
    <div class="page-header">
      <div class="back-button" @click="goBack">
        <AppIcon name="arrow_back" class="material-icons" />
        <span>{{ t('providerDetail.back') }}</span>
      </div>

      <h1 class="page-title">{{ providerName }}</h1>

      <div class="actions">
        <button class="btn btn-outline" :disabled="loading" @click="refreshStatus">
          <AppIcon name="refresh" class="material-icons" />
          <span v-if="loading">{{ t('common.refreshing') }}</span>
          <span v-else>{{ t('common.refresh') }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !hasProviderData" class="loading-state">
      <div class="loading-spinner"></div>
      <span>{{ t('providerDetail.loading') }}</span>
    </div>

    <div v-else-if="storeError && !hasProviderData" class="empty-state">
      <AppIcon name="cloud_off" class="empty-glyph" />
      <p class="empty-message">{{ t('common.serviceUnavailable') }}</p>
      <p class="empty-detail">{{ storeError }}</p>
      <button type="button" class="btn btn-outline" @click="refreshStatus">
        {{ t('common.refresh') }}
      </button>
    </div>

    <div v-else-if="!hasProviderData" class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p class="empty-message">{{ t('providerDetail.notFound') }}</p>
      <button class="btn btn-outline" @click="goBack">{{ t('providerDetail.return') }}</button>
    </div>

    <div v-else>
      <!-- Status Summary -->
      <div class="status-summary-section">
        <div class="overall-status">
          <div class="status-label">{{ t('providerDetail.overallStatus') }}</div>
          <StatusBadge :status="overallStatus" data-testid="provider-overall-status" />
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">{{ t('common.operational') }}</div>
            <div class="stat-value status-operational">{{ stats.operational }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-title">{{ t('common.degraded') }}</div>
            <div class="stat-value status-degraded">{{ stats.degraded }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-title">{{ t('common.outage') }}</div>
            <div class="stat-value status-outage">{{ stats.outage }}</div>
          </div>

          <div class="stat-card">
            <div class="stat-title">{{ t('common.maintenance') }}</div>
            <div class="stat-value status-maintenance">{{ stats.maintenance }}</div>
          </div>
        </div>
      </div>

      <!-- Region Filter -->
      <div class="filter-section">
        <div class="filter-header">
          <h2 class="section-title">{{ t('providerDetail.filterRegion') }}</h2>
        </div>

        <div class="region-filter">
          <button
            v-for="region in regions"
            :key="region.id"
            :class="['region-button', { active: activeRegion === region.id }]"
            @click="toggleRegionFilter(region.id)"
          >
            {{ region.name }}
          </button>

          <button v-if="activeRegion" class="region-button clear-filter" @click="clearRegionFilter">
            <AppIcon name="close" class="material-icons" />
            {{ t('providerDetail.clearFilter') }}
          </button>
        </div>
      </div>

      <!-- Services Table -->
      <div class="services-section">
        <div class="section-header">
          <h2 class="section-title">{{ t('providerDetail.services') }}</h2>
          <span class="result-count">{{
            t('dashboard.servicesCount', { count: filteredServices.length })
          }}</span>
        </div>

        <div class="services-table">
          <table>
            <thead>
              <tr>
                <th>{{ t('common.service') }}</th>
                <th>{{ t('common.region') }}</th>
                <th>{{ t('common.category') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('common.updatedCol') }}</th>
                <th class="details-col">
                  <span class="sr-only">{{ t('common.viewDetails') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="service in filteredServices"
                :key="service.id"
                :class="{ highlight: service.status !== 'operational' }"
              >
                <td>{{ service.serviceName }}</td>
                <td>{{ service.region }}</td>
                <td>{{ formatCategory(service.category) }}</td>
                <td><StatusBadge :status="service.status" /></td>
                <td>{{ formatTime(service.updatedAt) }}</td>
                <td>
                  <a
                    v-if="service.sourceUrl"
                    :href="service.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="details-link"
                  >
                    {{ t('common.viewDetails') }}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recently resolved (history) -->
      <div v-if="resolvedHistory.length" class="services-section" data-testid="resolved-history">
        <div class="section-header">
          <h2 class="section-title">{{ t('dashboard.recentlyResolved') }}</h2>
          <span class="result-count">{{
            t('dashboard.incidentsCount', { count: resolvedHistory.length })
          }}</span>
        </div>

        <div class="services-table">
          <table>
            <thead>
              <tr>
                <th>{{ t('dashboard.incident') }}</th>
                <th>{{ t('common.region') }}</th>
                <th>{{ t('common.updatedCol') }}</th>
                <th class="details-col">
                  <span class="sr-only">{{ t('common.viewDetails') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in resolvedHistory" :key="service.id">
                <td>{{ service.statusMessage || service.serviceName }}</td>
                <td>{{ service.region }}</td>
                <td>{{ formatTime(service.updatedAt) }}</td>
                <td>
                  <a
                    v-if="service.sourceUrl"
                    :href="service.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="details-link"
                  >
                    {{ t('common.viewDetails') }}
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';
import { StatusType } from '@/types/status';
import AppIcon from '@/components/AppIcon.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { getProviderDisplayName } from '@/utils/providerDisplay';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const statusStore = useStatusStore();
const loading = ref(true);
const activeRegion = ref('');
const storeError = computed(() => statusStore.error);

// Get provider ID from route params
const providerId = computed(() => route.params.id as string);

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

// Reset the region sub-filter when navigating between providers. We filter this
// page's services locally (see providerServices) rather than mutating the shared
// store filter, so the Dashboard/Providers views are unaffected.
watch(providerId, () => {
  activeRegion.value = '';
});

// Navigate back to providers list
function goBack() {
  router.push('/providers');
}

// Refresh status data
async function refreshStatus() {
  loading.value = true;
  try {
    await statusStore.refreshStatus();
  } finally {
    loading.value = false;
  }
}

// Toggle region filter
function toggleRegionFilter(regionId: string) {
  if (activeRegion.value === regionId) {
    activeRegion.value = '';
  } else {
    activeRegion.value = regionId;
  }
}

// Clear region filter
function clearRegionFilter() {
  activeRegion.value = '';
}

// Get services for this provider (filter locally from the full set)
const providerServices = computed(() => {
  return statusStore.services.filter(
    service => service.provider.toLowerCase() === providerId.value.toLowerCase()
  );
});

// Check if we have data for this provider
const hasProviderData = computed(() => providerServices.value.length > 0);

// Provider name
const providerName = computed(() => {
  return getProviderDisplayName(providerId.value);
});

// Filtered services by active region
const filteredServices = computed(() => {
  if (!activeRegion.value) return providerServices.value;

  return providerServices.value.filter(
    service => service.regionId === activeRegion.value || service.region === activeRegion.value
  );
});

// Recently resolved incidents for this provider, newest first — surfaced as a
// small history so a just-fixed incident stays visible without alarming.
const resolvedHistory = computed(() =>
  providerServices.value
    .filter(service => service.resolved)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10)
);

// Get unique regions for this provider
const regions = computed(() => {
  const regionMap = new Map();

  providerServices.value.forEach(service => {
    const id = service.regionId || service.region;
    regionMap.set(id, { id, name: service.region });
  });

  return Array.from(regionMap.values());
});

// Calculate overall status
const overallStatus = computed((): StatusType => {
  const services = providerServices.value;

  if (services.some(s => s.status === 'outage')) return 'outage';
  if (services.some(s => s.status === 'degraded')) return 'degraded';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  return 'operational';
});

// Calculate statistics
const stats = computed(() => {
  const services = providerServices.value;

  return {
    operational: services.filter(s => s.status === 'operational').length,
    degraded: services.filter(s => s.status === 'degraded').length,
    outage: services.filter(s => s.status === 'outage').length,
    maintenance: services.filter(s => s.status === 'maintenance').length
  };
});

function formatCategory(category: string | undefined): string {
  if (!category) return t('common.unknown');

  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatTime(timestamp: number): string {
  if (!timestamp) return t('common.unknown');

  const date = new Date(timestamp);
  const now = new Date();
  const loc = locale.value;

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return (
      date.toLocaleDateString(loc, { weekday: 'short' }) +
      ' ' +
      date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
    );
  }

  return date.toLocaleDateString(loc);
}
</script>

<style scoped>
@reference '../assets/tailwind.css';

.provider-detail-page {
  @apply space-y-6;
}

.page-header {
  @apply flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4;
}

.back-button {
  @apply flex items-center text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer mb-2 sm:mb-0;
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

.material-icons {
  @apply text-lg;
}

.loading-state {
  @apply flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-slate-300 dark:border-slate-600 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mb-2;
}

.empty-state {
  @apply flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400;
}

.empty-icon {
  @apply text-4xl mb-2;
}

.empty-message {
  @apply text-lg mb-4;
}

.empty-glyph {
  @apply text-5xl text-slate-400 dark:text-slate-500 mb-2;
}

.empty-detail {
  @apply text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md text-center break-words;
}

.details-link {
  @apply text-sm text-primary-600 dark:text-primary-400 hover:underline;
}

.sr-only {
  @apply absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0;
}

/* Status Summary Section */
.status-summary-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.overall-status {
  @apply flex flex-col items-center mb-6 text-center;
}

.status-label {
  @apply text-sm text-slate-500 dark:text-slate-400 font-medium mb-1;
}

.stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-card {
  @apply bg-slate-50 dark:bg-slate-700/50 rounded-md p-3 text-center;
}

.stat-title {
  @apply text-sm text-slate-500 dark:text-slate-400 font-medium mb-1;
}

.stat-value {
  @apply text-xl font-bold;
}

/* Filter Section */
.filter-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.filter-header {
  @apply mb-4;
}

.section-title {
  @apply text-lg font-medium text-slate-800 dark:text-slate-200;
}

.region-filter {
  @apply flex flex-wrap gap-2;
}

.region-button {
  @apply px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors;
}

.region-button.active {
  @apply bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-700;
}

.region-button.clear-filter {
  @apply flex items-center gap-1 bg-slate-200 dark:bg-slate-600;
}

/* Services Section */
.services-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.section-header {
  @apply flex justify-between items-center mb-4;
}

.result-count {
  @apply text-sm text-slate-500 dark:text-slate-400;
}

.services-table {
  @apply overflow-x-auto -mx-4 sm:-mx-0;
}

table {
  @apply min-w-full divide-y divide-slate-200 dark:divide-slate-700;
}

thead {
  @apply bg-slate-50 dark:bg-slate-700;
}

th {
  @apply px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider;
}

tbody {
  @apply bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700;
}

tr {
  @apply hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors;
}

tr.highlight {
  @apply bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30;
}

td {
  @apply px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200;
}
</style>
