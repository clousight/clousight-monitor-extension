<template>
  <div class="w-[360px] border border-slate-800 bg-slate-950 p-3 ring-1 ring-slate-700/80">
    <header class="mb-3 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <img class="h-8 w-8 rounded" :src="iconUrl" alt="" />
        <div>
          <h1 class="text-sm font-semibold text-white">{{ t('app.brand') }}</h1>
          <p class="text-xs text-slate-400">{{ t('popup.tagline') }}</p>
        </div>
      </div>
      <button
        type="button"
        class="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-colors duration-200"
        @click="openDashboard"
      >
        {{ t('popup.dashboard') }}
      </button>
    </header>

    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-medium text-slate-300">{{ t('common.providers') }}</span>
      <button
        type="button"
        class="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded px-0.5 transition-colors duration-200"
        :disabled="statusStore.loading"
        @click="refresh"
      >
        {{ statusStore.loading ? t('popup.refreshing') : t('popup.refresh') }}
      </button>
    </div>

    <div
      v-if="statusStore.error"
      class="mb-2 rounded border border-amber-900/60 bg-amber-950/40 px-2 py-1.5 text-xs text-amber-200"
    >
      {{ statusStore.error }}
    </div>

    <ul class="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
      <li
        v-for="row in providerSummary"
        :key="row.id"
        class="flex items-center justify-between rounded-md bg-slate-900/80 px-2 py-1.5 text-xs"
      >
        <span class="font-medium text-slate-200">{{ row.name }}</span>
        <span :class="badgeClass(row.worst)">{{ t(`status.short.${row.worst}`) }}</span>
      </li>
    </ul>

    <p class="mt-2 text-[11px] text-slate-500">
      {{ t('common.lastUpdated') }} {{ lastUpdatedText }}
    </p>

    <div class="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
      <button
        type="button"
        class="text-xs text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded px-0.5 transition-colors duration-200"
        @click="openOptions"
      >
        {{ t('popup.settings') }}
      </button>
      <span class="text-[10px] text-slate-600">{{ t('popup.versionNote') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatusStore } from '@/stores/statusStore';
import { useStatusLastUpdated } from '@/composables/useStatusLastUpdated';
import type { StatusType } from '@/types/status';

const { t } = useI18n();
const statusStore = useStatusStore();
const lastUpdatedText = useStatusLastUpdated();

const iconUrl =
  typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('icons/icon48.png')
    : '/icons/icon48.png';

const providerSummary = computed(() => {
  const map = new Map<string, { id: string; name: string; worst: StatusType }>();

  const rank: Record<StatusType, number> = {
    outage: 4,
    degraded: 3,
    maintenance: 2,
    operational: 1
  };

  for (const s of statusStore.services) {
    const id = s.provider.toLowerCase();
    const name = s.provider;
    const cur = map.get(id);
    if (!cur) {
      map.set(id, { id, name, worst: s.status });
      continue;
    }
    const next = rank[s.status] ?? 0;
    const prev = rank[cur.worst] ?? 0;
    if (next > prev) {
      cur.worst = s.status;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
});

function badgeClass(status: StatusType): string {
  switch (status) {
    case 'outage':
      return 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-red-950 text-red-200';
    case 'degraded':
      return 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-amber-950 text-amber-200';
    case 'maintenance':
      return 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-slate-800 text-slate-200';
    default:
      return 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase bg-emerald-950 text-emerald-200';
  }
}

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
