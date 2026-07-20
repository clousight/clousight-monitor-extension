<template>
  <div class="notifications-page">
    <h2 class="page-title">{{ t('notifications.title') }}</h2>

    <div class="notification-filters">
      <div class="filter-group">
        <label for="severity-filter" class="filter-label">{{ t('notifications.severity') }}</label>
        <select id="severity-filter" v-model="severityFilter" class="form-select">
          <option value="all">{{ t('notifications.allSeverities') }}</option>
          <option value="info">{{ t('notifications.info') }}</option>
          <option value="warning">{{ t('notifications.warning') }}</option>
          <option value="critical">{{ t('notifications.critical') }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="provider-filter" class="filter-label">{{ t('notifications.provider') }}</label>
        <select id="provider-filter" v-model="providerFilter" class="form-select">
          <option value="all">{{ t('notifications.allProviders') }}</option>
          <option v-for="provider in providers" :key="provider" :value="provider">
            {{ provider }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="time-filter" class="filter-label">{{ t('notifications.time') }}</label>
        <select id="time-filter" v-model="timeFilter" class="form-select">
          <option value="all">{{ t('notifications.allTime') }}</option>
          <option value="today">{{ t('notifications.today') }}</option>
          <option value="week">{{ t('notifications.week') }}</option>
          <option value="month">{{ t('notifications.month') }}</option>
        </select>
      </div>
    </div>

    <div v-if="!notificationsEnabled" class="notification-settings-banner">
      <div class="warning-icon">⚠️</div>
      <div class="settings-message">
        <p>{{ t('notifications.disabled') }}</p>
        <button class="btn btn-outline btn-sm" @click="goToSettings">
          {{ t('notifications.enableInSettings') }}
        </button>
      </div>
    </div>

    <NotificationCenter
      :severity-filter="severityFilter"
      :provider-filter="providerFilter"
      :time-filter="timeFilter"
    />

    <div class="notifications-help">
      <h3 class="help-title">{{ t('notifications.aboutTitle') }}</h3>
      <p>{{ t('notifications.aboutP1') }}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {{ t('notifications.aboutSeverityNote') }}
      </p>
      <ul class="notification-types">
        <li><span class="type-icon info">i</span> {{ t('notifications.aboutLi1') }}</li>
        <li><span class="type-icon warning">!</span> {{ t('notifications.aboutLi2') }}</li>
        <li><span class="type-icon critical">!!</span> {{ t('notifications.aboutLi3') }}</li>
      </ul>
      <i18n-t keypath="notifications.aboutSettings" tag="p" class="mt-2">
        <template #settings>
          <a href="#" class="text-primary-600 hover:underline" @click.prevent="goToSettings">{{
            t('notifications.settingsLink')
          }}</a>
        </template>
      </i18n-t>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import NotificationCenter from '@/components/NotificationCenter.vue';
import { emitNotificationsRefresh } from '@/constants/clousightEvents';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();

const severityFilter = ref('all');
const providerFilter = ref('all');
const timeFilter = ref('all');

/** Match normalized_events.provider codes from the API */
const providers = ref(['AWS', 'AZURE', 'GCP', 'ALIBABA', 'TENCENT', 'HUAWEI', 'VOLCANO']);

// Check if browser notifications are enabled in user settings
const notificationsEnabled = computed(() => userStore.settings.notifications.browser);

// Navigate to settings page
function goToSettings() {
  router.push('/settings');
}

// Initialize page
onMounted(async () => {
  // Make sure user store is initialized
  if (!userStore.isInitialized) {
    await userStore.initialize();
  }
});

onActivated(() => {
  emitNotificationsRefresh();
});
</script>

<style scoped>
@reference '../assets/tailwind.css';

.notifications-page {
  @apply flex flex-col space-y-4;
}

.page-title {
  @apply text-lg font-semibold mb-2;
}

.notification-filters {
  @apply flex flex-wrap gap-4 mb-2;
}

.filter-group {
  @apply flex flex-col;
}

.filter-label {
  @apply text-xs text-slate-500 mb-1;
}

.form-select {
  @apply block w-full border-slate-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm;
  min-width: 120px;
}

.notification-settings-banner {
  @apply flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4;
}

.warning-icon {
  @apply text-xl;
}

.settings-message {
  @apply flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2;
}

.settings-message p {
  @apply text-sm text-yellow-800 dark:text-yellow-200;
}

.notifications-help {
  @apply mt-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700;
}

.help-title {
  @apply text-base font-medium mb-2;
}

.notifications-help p {
  @apply text-sm text-slate-600 dark:text-slate-400 mb-2;
}

.notification-types {
  @apply mt-2 space-y-2;
}

.notification-types li {
  @apply flex items-center text-sm text-slate-600 dark:text-slate-400;
}

.type-icon {
  @apply inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 text-xs font-bold;
}

.type-icon.info {
  @apply bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300;
}

.type-icon.warning {
  @apply bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300;
}

.type-icon.critical {
  @apply bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300;
}
</style>
