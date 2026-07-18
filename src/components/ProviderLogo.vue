<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"
    :class="sizeClass"
  >
    <img
      v-if="logoUrl && !failed"
      :src="logoUrl"
      :alt="name"
      class="h-full w-full object-contain p-0.5"
      @error="failed = true"
    />
    <span
      v-else
      class="text-[0.65rem] font-semibold uppercase text-slate-600 dark:text-slate-300"
      aria-hidden="true"
    >
      {{ initial }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { getProviderLogoUrl } from '@/utils/providerDisplay';

const props = withDefaults(defineProps<{ code: string; name: string; size?: 'sm' | 'md' }>(), {
  size: 'sm'
});

const failed = ref(false);
const logoUrl = computed(() => getProviderLogoUrl(props.code));
const initial = computed(() => (props.name.trim()[0] ?? '?').toUpperCase());
const sizeClass = computed(() => (props.size === 'md' ? 'h-8 w-8' : 'h-5 w-5'));
</script>
