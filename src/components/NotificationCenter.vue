<template>
  <div class="notification-center">
    <div class="notification-header">
      <h3 class="notification-title">{{ t('notificationCenter.title') }}</h3>
      <div class="actions">
        <button
          v-if="unreadIdList.length > 0"
          type="button"
          class="clear-all"
          :disabled="busy"
          @click="markAllRead"
        >
          {{ t('notificationCenter.markAllRead') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="notification-loading">
      {{ t('notificationCenter.loading') }}
    </div>

    <div v-else-if="items.length === 0" class="no-notifications">
      <div class="empty-icon">🔔</div>
      <p>{{ t('notificationCenter.empty') }}</p>
    </div>

    <div v-else-if="displayItems.length === 0" class="no-notifications">
      <p>{{ t('notificationCenter.emptyFiltered') }}</p>
    </div>

    <div v-else class="notification-list">
      <div
        v-for="row in displayItems"
        :key="row.id"
        :class="['notification-item', `notification-${row.severity}`, { unread: !row.read }]"
      >
        <div class="notification-content">
          <div class="notification-meta">
            <span class="provider">{{ row.provider }}</span>
            <span class="time">{{ formatTime(row.timestamp) }}</span>
          </div>
          <div class="notification-message">{{ row.message }}</div>
          <div v-if="row.region" class="text-xs text-slate-500 mt-1">
            {{ t('common.region') }}: {{ row.region }}
          </div>
          <div v-if="row.sourceUrl" class="mt-1">
            <a
              :href="row.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary-600 text-sm hover:underline"
            >
              {{ t('notificationCenter.sourceLink') }}
            </a>
          </div>

          <div v-if="row.briefText" class="brief-box mt-2">
            <div class="brief-label">{{ t('notificationCenter.briefLabel') }}</div>
            <p class="brief-body whitespace-pre-wrap">{{ row.briefText }}</p>
          </div>
          <p v-if="row.briefError" class="text-sm text-red-600 mt-1">{{ row.briefError }}</p>

          <div v-if="llmReady && !row.briefText" class="mt-2">
            <button
              type="button"
              class="btn-text text-sm"
              :disabled="row.briefLoading"
              @click="loadBrief(row)"
            >
              {{
                row.briefLoading
                  ? t('notificationCenter.briefLoading')
                  : t('notificationCenter.brief')
              }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="dismiss-btn"
          :title="t('notificationCenter.dismissTitle')"
          :disabled="busy"
          @click="dismissOne(row)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, withDefaults } from 'vue';
import { useI18n } from 'vue-i18n';
import { getNotifications, markRead, markAllSeen } from '@/services/notifications';
import type { LocalNotification } from '@/services/notifications';
import { generateBrief, isLlmConfigured } from '@/services/llm';
import { emitUnreadChanged, CLOUDNORTH_NOTIFICATIONS_REFRESH } from '@/constants/cloudnorthEvents';

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    severityFilter?: string;
    providerFilter?: string;
    timeFilter?: string;
  }>(),
  {
    severityFilter: 'all',
    providerFilter: 'all',
    timeFilter: 'all'
  }
);

type SevBucket = 'info' | 'warning' | 'critical';
interface UiItem {
  id: string;
  provider: string;
  timestamp: number;
  message: string;
  severity: SevBucket;
  rawSeverity: string;
  body: string | null;
  region?: string;
  sourceUrl?: string | null;
  read: boolean;
  briefText?: string;
  briefError?: string;
  briefLoading?: boolean;
}

const loading = ref(true);
const busy = ref(false);
const items = ref<UiItem[]>([]);
const llmReady = ref(false);

function toBucket(s: string): SevBucket {
  if (s === 'critical') {
    return 'critical';
  }
  if (s === 'major' || s === 'minor') {
    return 'warning';
  }
  return 'info';
}

function toUiItem(n: LocalNotification): UiItem {
  return {
    id: n.id,
    provider: n.provider || '—',
    timestamp: n.createdAt,
    message: n.title,
    severity: toBucket(n.severity),
    rawSeverity: n.severity,
    body: n.body,
    region: n.region || undefined,
    sourceUrl: n.sourceUrl,
    read: n.read
  };
}

function matchesProvider(rowProvider: string, filter: string): boolean {
  if (filter === 'all') {
    return true;
  }
  const a = rowProvider.trim().toUpperCase();
  const b = filter.trim().toUpperCase();
  return a === b || a.includes(b) || b.includes(a);
}

function matchesTimeFilter(ts: number, tf: string): boolean {
  if (tf === 'all') {
    return true;
  }
  const now = Date.now();
  if (tf === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return ts >= start.getTime();
  }
  if (tf === 'week') {
    return now - ts <= 7 * 24 * 60 * 60 * 1000;
  }
  if (tf === 'month') {
    return now - ts <= 30 * 24 * 60 * 60 * 1000;
  }
  return true;
}

const displayItems = computed(() => {
  let list = items.value;
  if (props.severityFilter && props.severityFilter !== 'all') {
    list = list.filter(i => i.severity === props.severityFilter);
  }
  if (props.providerFilter && props.providerFilter !== 'all') {
    list = list.filter(i => matchesProvider(i.provider, props.providerFilter));
  }
  if (props.timeFilter && props.timeFilter !== 'all') {
    list = list.filter(i => matchesTimeFilter(i.timestamp, props.timeFilter));
  }
  return list;
});

const unreadIdList = computed(() => items.value.filter(i => !i.read).map(i => i.id));

async function loadList(): Promise<void> {
  loading.value = true;
  try {
    const stored = await getNotifications();
    items.value = stored.map(toUiItem);
    // Viewing the list clears the "unseen" flag that drives the toolbar badge.
    await markAllSeen();
    emitUnreadChanged();
  } finally {
    loading.value = false;
  }
}

async function dismissOne(row: UiItem): Promise<void> {
  busy.value = true;
  try {
    await markRead([row.id]);
    items.value = items.value.filter(x => x.id !== row.id);
    emitUnreadChanged();
  } finally {
    busy.value = false;
  }
}

async function markAllRead(): Promise<void> {
  const ids = [...unreadIdList.value];
  if (ids.length === 0) {
    return;
  }
  busy.value = true;
  try {
    await markRead(ids);
    items.value = items.value.map(r => ({ ...r, read: true }));
    emitUnreadChanged();
  } finally {
    busy.value = false;
  }
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) {
    return t('notificationCenter.justNow');
  }
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return minutes === 1
      ? t('notificationCenter.oneMinuteAgo')
      : t('notificationCenter.minutesAgo', { count: minutes });
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return hours === 1
      ? t('notificationCenter.oneHourAgo')
      : t('notificationCenter.hoursAgo', { count: hours });
  }
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return days === 1
    ? t('notificationCenter.oneDayAgo')
    : t('notificationCenter.daysAgo', { count: days });
}

async function loadBrief(row: UiItem): Promise<void> {
  const idx = items.value.findIndex(i => i.id === row.id);
  if (idx < 0) {
    return;
  }
  items.value.splice(idx, 1, { ...items.value[idx], briefLoading: true, briefError: undefined });
  try {
    const brief = await generateBrief({
      provider: row.provider,
      title: row.message,
      body: row.body,
      severity: row.rawSeverity,
      region: row.region,
      sourceUrl: row.sourceUrl
    });
    const v = items.value.findIndex(i => i.id === row.id);
    if (v >= 0) {
      items.value.splice(v, 1, { ...items.value[v], briefLoading: false, briefText: brief });
    }
  } catch {
    const v = items.value.findIndex(i => i.id === row.id);
    if (v >= 0) {
      items.value.splice(v, 1, {
        ...items.value[v],
        briefLoading: false,
        briefError: t('notificationCenter.briefFailed')
      });
    }
  }
}

function onExternalRefresh(): void {
  void loadList();
}

onMounted(async () => {
  window.addEventListener(CLOUDNORTH_NOTIFICATIONS_REFRESH, onExternalRefresh);
  llmReady.value = await isLlmConfigured();
  await loadList();
});

onBeforeUnmount(() => {
  window.removeEventListener(CLOUDNORTH_NOTIFICATIONS_REFRESH, onExternalRefresh);
});
</script>

<style scoped>
.notification-center {
  @apply bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden;
}

.notification-header {
  @apply flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700;
}

.notification-title {
  @apply text-base font-semibold text-slate-800 dark:text-slate-200;
}

.actions .clear-all {
  @apply text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 disabled:opacity-50;
}

.notification-loading,
.no-notifications {
  @apply py-8 px-4 text-center text-slate-500 dark:text-slate-400;
}

.no-notifications .empty-icon {
  @apply text-2xl mb-2;
}

.notification-list {
  @apply divide-y divide-slate-200 dark:divide-slate-700 max-h-80 overflow-y-auto;
}

.notification-item {
  @apply px-4 py-3 flex justify-between items-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800;
}

.notification-item.unread {
  @apply bg-primary-50/40 dark:bg-primary-900/10;
}

.notification-warning {
  @apply border-l-4 border-yellow-400;
}

.notification-critical {
  @apply border-l-4 border-red-500;
}

.notification-info {
  @apply border-l-4 border-blue-500;
}

.notification-content {
  @apply flex-1 min-w-0;
}

.notification-meta {
  @apply flex justify-between text-xs mb-1;
}

.provider {
  @apply font-medium text-slate-800 dark:text-slate-200;
}

.time {
  @apply text-slate-500 dark:text-slate-400 shrink-0 ml-2;
}

.notification-message {
  @apply text-sm text-slate-700 dark:text-slate-300 mb-2;
}

.brief-box {
  @apply rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-2 py-2 text-sm;
}

.brief-label {
  @apply text-xs font-medium text-slate-500 dark:text-slate-400 mb-1;
}

.brief-body {
  @apply text-slate-800 dark:text-slate-200;
}

.btn-text {
  @apply text-primary-600 hover:text-primary-700 dark:text-primary-400 bg-transparent border-0 cursor-pointer p-0;
}

.dismiss-btn {
  @apply text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-medium leading-none ml-2 shrink-0;
}
</style>
