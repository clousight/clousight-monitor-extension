<template>
  <span
    role="status"
    :aria-label="resolvedLabel"
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="`status-${status}`"
  >
    <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
    {{ resolvedLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StatusType } from '@/types/status';

const props = defineProps<{ status: StatusType | 'unknown'; label?: string }>();
const { t } = useI18n();
const resolvedLabel = computed(() => props.label ?? t(`status.short.${props.status}`));
</script>

<style scoped>
.status-operational {
  @apply bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300;
}

.status-degraded {
  @apply bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-200;
}

.status-outage {
  @apply bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-200;
}

.status-maintenance {
  @apply bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200;
}

.status-unknown {
  @apply bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300;
}
</style>
