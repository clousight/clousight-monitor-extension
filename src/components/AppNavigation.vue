<template>
  <nav class="app-navigation">
    <div class="nav-section">
      <router-link to="/" class="nav-item" active-class="active">
        <div class="icon">
          <AppIcon name="dashboard" class="material-icons" />
        </div>
        <span class="label">{{ t('nav.dashboard') }}</span>
      </router-link>

      <router-link to="/providers" class="nav-item" active-class="active">
        <div class="icon">
          <AppIcon name="cloud" class="material-icons" />
        </div>
        <span class="label">{{ t('nav.providers') }}</span>
      </router-link>

      <router-link to="/notifications" class="nav-item" active-class="active">
        <div class="icon">
          <AppIcon name="notifications" class="material-icons" />
          <span v-if="unreadNotifications > 0" class="notification-badge">
            {{ unreadNotifications > 9 ? '9+' : unreadNotifications }}
          </span>
        </div>
        <span class="label">{{ t('nav.notifications') }}</span>
      </router-link>

      <router-link to="/subscriptions" class="nav-item" active-class="active">
        <div class="icon">
          <AppIcon name="rule" class="material-icons" />
        </div>
        <span class="label">{{ t('nav.subscriptions') }}</span>
      </router-link>
    </div>

    <div class="nav-section">
      <router-link to="/settings" class="nav-item" active-class="active">
        <div class="icon">
          <AppIcon name="settings" class="material-icons" />
        </div>
        <span class="label">{{ t('nav.settings') }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import AppIcon from '@/components/AppIcon.vue';
import { unreadCount } from '@/services/notifications';
import { CLOUSIGHT_UNREAD_CHANGED } from '@/constants/clousightEvents';

const { t } = useI18n();

const unreadNotifications = ref(0);

async function refreshUnreadBadge(): Promise<void> {
  unreadNotifications.value = await unreadCount();
}

let unreadPoll: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  window.addEventListener(CLOUSIGHT_UNREAD_CHANGED, refreshUnreadBadge);
  void refreshUnreadBadge();
  unreadPoll = setInterval(() => void refreshUnreadBadge(), 120_000);
});

onBeforeUnmount(() => {
  window.removeEventListener(CLOUSIGHT_UNREAD_CHANGED, refreshUnreadBadge);
  if (unreadPoll) {
    clearInterval(unreadPoll);
  }
});
</script>

<style scoped>
.app-navigation {
  @apply flex h-full flex-col justify-between;
}

.nav-section {
  @apply flex flex-col;
}

.nav-item {
  @apply flex items-center min-h-[44px] px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500;
}

.nav-item.active {
  @apply bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300;
}

.icon {
  @apply relative flex items-center justify-center w-6 h-6 mr-3;
}

.material-icons {
  @apply text-xl;
}

.notification-badge {
  @apply absolute -top-1 -right-1 flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-0.5 text-[10px] leading-none bg-danger-500 text-white rounded-full font-medium;
}
</style>
