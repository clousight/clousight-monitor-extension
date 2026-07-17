<template>
  <div class="flex min-w-0 items-center gap-2.5">
    <img
      src="/images/logo.svg"
      alt=""
      class="shrink-0"
      :class="compact ? 'h-8 w-8' : 'h-10 w-10'"
    />
    <div data-brand-text class="min-w-0">
      <div class="truncate font-semibold text-slate-900 dark:text-white">
        {{ t('app.brand') }}
      </div>
      <div v-if="subtitle" class="truncate text-xs text-slate-500 dark:text-slate-400">
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

withDefaults(defineProps<{ compact?: boolean; subtitle?: string }>(), {
  compact: false,
  subtitle: undefined
});
const { t } = useI18n();
</script>
