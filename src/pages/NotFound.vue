<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <div class="error-code">404</div>
      <h1 class="error-title">{{ t('notFound.title') }}</h1>
      <p class="error-message">
        {{ t('notFound.message') }}
      </p>
      <div class="action-buttons">
        <router-link to="/" class="btn btn-primary">
          {{ t('notFound.goDashboard') }}
        </router-link>
        <button class="btn btn-outline" @click="goBack">
          {{ t('notFound.goBack') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();

// Navigate back to previous page
function goBack() {
  router.go(-1);
}
</script>

<style scoped>
@reference '../assets/tailwind.css';

.not-found-page {
  @apply flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 px-4;
}

.not-found-container {
  @apply max-w-md w-full text-center space-y-6 py-16;
}

.error-code {
  @apply text-7xl font-bold text-primary-600 dark:text-primary-400;
}

.error-title {
  @apply text-3xl font-bold text-slate-800 dark:text-slate-200;
}

.error-message {
  @apply text-slate-600 dark:text-slate-400 mb-8;
}

.action-buttons {
  @apply flex flex-col sm:flex-row justify-center gap-4;
}

.btn {
  @apply inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-md text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors duration-200 sm:w-auto;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}

.btn-outline {
  @apply border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700;
}
</style>
