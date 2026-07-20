<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <h1 class="page-title">{{ t('dashboard.title') }}</h1>

      <div class="actions">
        <button class="btn btn-outline" :disabled="loading" @click="refreshStatus">
          <AppIcon name="refresh" class="material-icons" />
          <span v-if="loading">{{ t('common.refreshing') }}</span>
          <span v-else>{{ t('common.refresh') }}</span>
        </button>
      </div>
    </div>

    <!-- Status Summary -->
    <div class="status-summary-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">{{ t('common.operational') }}</div>
          <div class="stat-value status-operational">{{ overallHealth.operational }}</div>
          <div class="stat-desc">{{ t('dashboard.desc.operational') }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">{{ t('common.degraded') }}</div>
          <div class="stat-value status-degraded">{{ overallHealth.degraded }}</div>
          <div class="stat-desc">{{ t('dashboard.desc.degraded') }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">{{ t('common.outage') }}</div>
          <div class="stat-value status-outage">{{ overallHealth.outage }}</div>
          <div class="stat-desc">{{ t('dashboard.desc.outage') }}</div>
        </div>

        <div class="stat-card">
          <div class="stat-title">{{ t('common.maintenance') }}</div>
          <div class="stat-value status-maintenance">{{ overallHealth.maintenance }}</div>
          <div class="stat-desc">{{ t('dashboard.desc.maintenance') }}</div>
        </div>
      </div>

      <div class="update-info">
        <span class="update-label">{{ t('common.lastUpdated') }}</span>
        <span class="update-time">{{ lastUpdatedText }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="section-header">
        <h2 class="section-title">{{ t('common.filters') }}</h2>
        <button v-if="hasActiveFilters" class="clear-filters-btn" @click="clearAllFilters">
          {{ t('common.clearAll') }}
        </button>
      </div>

      <div class="filters-grid">
        <div class="filter-group">
          <label for="provider-filter" class="filter-label">{{ t('common.providers') }}</label>
          <select
            id="provider-filter"
            v-model="filters.provider"
            class="filter-select"
            @change="applyFilters"
          >
            <option value="">{{ t('common.allProviders') }}</option>
            <option v-for="provider in providers" :key="provider.id" :value="provider.id">
              {{ provider.name }}
            </option>
          </select>
        </div>

        <div class="filter-group">
          <label for="status-filter" class="filter-label">{{ t('common.status') }}</label>
          <select
            id="status-filter"
            v-model="filters.status"
            class="filter-select"
            @change="applyFilters"
          >
            <option value="">{{ t('common.allStatuses') }}</option>
            <option value="degraded">{{ t('common.degraded') }}</option>
            <option value="outage">{{ t('common.outage') }}</option>
            <option value="maintenance">{{ t('common.maintenance') }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Service Status Table -->
    <div class="status-table-section">
      <div v-if="loading && !hasServiceRows" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ t('dashboard.loadingStatus') }}</span>
      </div>

      <div v-else-if="storeError && !hasServiceRows" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <AppIcon name="cloud_off" class="material-icons empty-icon-glyph" />
        </div>
        <p class="empty-message">{{ t('common.serviceUnavailable') }}</p>
        <p class="empty-detail">{{ storeError }}</p>
        <button type="button" class="btn btn-outline" @click="refreshStatus">
          {{ t('common.refresh') }}
        </button>
      </div>

      <div v-else-if="!hasServiceRows && !hasActiveFilters" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <AppIcon name="cloud_off" class="material-icons empty-icon-glyph" />
        </div>
        <p class="empty-message">{{ t('dashboard.statusUnavailable') }}</p>
        <button type="button" class="btn btn-outline" @click="refreshStatus">
          {{ t('common.refresh') }}
        </button>
      </div>

      <div v-else-if="filteredServices.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <AppIcon name="search_off" class="material-icons empty-icon-glyph" />
        </div>
        <p class="empty-message">{{ t('dashboard.emptyFilters') }}</p>
        <button class="btn btn-outline" @click="clearAllFilters">
          {{ t('common.clearFilters') }}
        </button>
      </div>

      <div v-else-if="activeIncidents.length === 0" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <AppIcon name="cloud" class="material-icons empty-icon-glyph" />
        </div>
        <p class="empty-message">{{ t('dashboard.allClear') }}</p>
      </div>

      <div v-else data-testid="active-incidents">
        <div class="status-table-header">
          <h2 class="section-title">{{ t('dashboard.activeIncidents') }}</h2>
          <span class="result-count">{{
            t('dashboard.incidentsCount', { count: activeIncidents.length })
          }}</span>
        </div>

        <div class="status-table">
          <table>
            <thead>
              <tr>
                <th>{{ t('common.providers') }}</th>
                <th>{{ t('dashboard.incident') }}</th>
                <th>{{ t('common.status') }}</th>
                <th>{{ t('common.updatedCol') }}</th>
                <th class="details-col">
                  <span class="sr-only">{{ t('common.viewDetails') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="service in activeIncidents" :key="service.id">
                <td>
                  <div class="provider-cell">
                    <ProviderLogo
                      :code="service.provider"
                      :name="getProviderDisplayName(service.provider)"
                    />
                    <span>{{ getProviderDisplayName(service.provider) }}</span>
                  </div>
                </td>
                <td>{{ service.statusMessage || service.serviceName }}</td>
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
    </div>

    <!-- Recently resolved (history) -->
    <div v-if="resolvedHistory.length" class="status-table-section" data-testid="resolved-history">
      <div class="status-table-header">
        <h2 class="section-title">{{ t('dashboard.recentlyResolved') }}</h2>
        <span class="result-count">{{
          t('dashboard.incidentsCount', { count: resolvedHistory.length })
        }}</span>
      </div>

      <div class="status-table">
        <table>
          <thead>
            <tr>
              <th>{{ t('common.providers') }}</th>
              <th>{{ t('dashboard.incident') }}</th>
              <th>{{ t('common.updatedCol') }}</th>
              <th class="details-col">
                <span class="sr-only">{{ t('common.viewDetails') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in resolvedHistory" :key="service.id">
              <td>
                <div class="provider-cell">
                  <ProviderLogo
                    :code="service.provider"
                    :name="getProviderDisplayName(service.provider)"
                  />
                  <span>{{ getProviderDisplayName(service.provider) }}</span>
                </div>
              </td>
              <td>{{ service.statusMessage || service.serviceName }}</td>
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';
import { useStatusLastUpdated } from '@/composables/useStatusLastUpdated';
import { StatusType } from '@/types/status';
import AppIcon from '@/components/AppIcon.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import ProviderLogo from '@/components/ProviderLogo.vue';
import { getProviderDisplayName } from '@/utils/providerDisplay';
import { deriveOverallHealth, deriveProviderSummaries } from '@/utils/statusSummary';
import { useProviderSubscription } from '@/composables/useProviderSubscription';

const { t, locale } = useI18n();
const statusStore = useStatusStore();
const lastUpdatedText = useStatusLastUpdated();
const { isWatched } = useProviderSubscription();
const loading = ref(true);
const storeError = computed(() => statusStore.error);

// Only include providers the user watches — everywhere on the dashboard — so
// unwatched providers are neither counted, listed, nor filterable, even if their
// data still lingers in the store before the background next refetches.
const watchedServices = computed(() =>
  statusStore.filteredServices.filter(s => isWatched(s.provider.toUpperCase()))
);

// Filter state
const filters = ref({
  provider: '',
  status: ''
});

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

// Get computed values from store (watched providers only)
const providerSummaries = computed(() =>
  deriveProviderSummaries(statusStore.services).filter(s => isWatched(s.code))
);
const overallHealth = computed(() => deriveOverallHealth(providerSummaries.value));
const providers = computed(() => statusStore.providers.filter(p => isWatched(p.id.toUpperCase())));
const filteredServices = computed(() => watchedServices.value);
// Active incidents only: operational rows (resolved incidents + all-clear
// placeholders) are excluded so the list shows what actually needs attention.
const activeIncidents = computed(() =>
  filteredServices.value.filter(service => service.status !== 'operational')
);
// Recently resolved incidents, newest first — a light "history" separate from
// the active list so a just-fixed incident is still visible without alarming.
const resolvedHistory = computed(() =>
  filteredServices.value
    .filter(service => service.resolved)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10)
);
// Check if any filters are active
const hasActiveFilters = computed(() => {
  return Object.values(filters.value).some(value => value !== '');
});

const hasServiceRows = computed(() => statusStore.services.length > 0);

// Refresh status data
async function refreshStatus() {
  loading.value = true;
  try {
    await statusStore.refreshStatus();
  } finally {
    loading.value = false;
  }
}

// Apply filters to store
function applyFilters() {
  statusStore.setFilters({
    provider: filters.value.provider || null,
    status: (filters.value.status as StatusType) || null
  });
}

// Clear all filters
function clearAllFilters() {
  filters.value = {
    provider: '',
    status: ''
  };
  statusStore.clearFilters();
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

.dashboard-page {
  @apply space-y-6;
}

.dashboard-header {
  @apply flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4;
}

.page-title {
  @apply text-2xl font-bold text-slate-800 dark:text-slate-100;
}

.actions {
  @apply flex items-center gap-2;
}

.btn {
  @apply inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200;
}

.btn-outline {
  @apply border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700;
}

.material-icons {
  @apply text-lg;
}

/* Status Summary Section */
.status-summary-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.stats-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.stat-card {
  @apply bg-slate-50 dark:bg-slate-700/50 rounded-md p-4 text-center;
}

.stat-title {
  @apply text-sm text-slate-500 dark:text-slate-400 font-medium mb-1;
}

.stat-value {
  @apply text-2xl font-bold;
}

.stat-desc {
  @apply text-xs text-slate-500 dark:text-slate-400 mt-1;
}

.update-info {
  @apply mt-4 text-xs text-right text-slate-500 dark:text-slate-400;
}

.update-time {
  @apply font-medium;
}

/* Filters Section */
.filters-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
}

.section-header {
  @apply flex justify-between items-center mb-4;
}

.section-title {
  @apply text-lg font-medium text-slate-800 dark:text-slate-200;
}

.clear-filters-btn {
  @apply text-sm text-primary-600 dark:text-primary-400 hover:underline;
}

.filters-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4;
}

.filter-group {
  @apply flex flex-col;
}

.filter-label {
  @apply text-sm text-slate-500 dark:text-slate-400 mb-1;
}

.filter-select {
  @apply block w-full border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200;
}

/* Status Table Section */
.status-table-section {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4;
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
  @apply mb-2 flex items-center justify-center text-slate-400 dark:text-slate-500;
}

.empty-icon-glyph {
  @apply text-5xl;
}

.empty-message {
  @apply text-lg mb-4;
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

.status-table-header {
  @apply flex justify-between items-center mb-4;
}

.result-count {
  @apply text-sm text-slate-500 dark:text-slate-400;
}

.status-table {
  @apply overflow-x-auto -mx-4 sm:-mx-0;
}

.provider-cell {
  @apply flex items-center gap-2;
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
  @apply hover:bg-slate-50 dark:hover:bg-slate-700/50;
}

td {
  @apply px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200;
}

@media (max-width: 640px) {
  table {
    @apply table-fixed;
  }

  th:nth-child(3), td:nth-child(3), /* Region */
  th:nth-child(4), td:nth-child(4) {
    /* Category */
    @apply hidden;
  }
}
</style>
