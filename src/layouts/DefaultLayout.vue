<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="app-layout">
      <aside
        class="sidebar w-64 max-[768px]:fixed max-[768px]:inset-x-0 max-[768px]:top-0 max-[768px]:h-16 max-[768px]:w-full max-[768px]:border-r-0"
      >
        <header class="sidebar-header mobile-top-header max-[768px]:w-full">
          <AppBrand compact class="sidebar-brand max-[768px]:min-w-0 max-[768px]:flex-1" />
          <button
            type="button"
            class="mobile-toggle hidden min-h-[44px] min-w-[44px] max-[768px]:flex max-[768px]:shrink-0"
            :aria-expanded="sidebarOpen"
            aria-controls="sidebar-nav-panel"
            :aria-label="sidebarOpen ? t('nav.closeMenu') : t('nav.openMenu')"
            @click="toggleSidebar"
          >
            <AppIcon :name="sidebarOpen ? 'close' : 'menu'" size="1.5rem" />
          </button>
        </header>

        <div
          id="sidebar-nav-panel"
          class="sidebar-content mobile-drawer max-[768px]:fixed max-[768px]:top-16 max-[768px]:bottom-0 max-[768px]:left-0 max-[768px]:w-64 max-[768px]:border-r max-[768px]:border-slate-200 max-[768px]:shadow-xl max-[768px]:transform max-[768px]:-translate-x-full max-[768px]:transition-transform max-[768px]:duration-200 max-[768px]:ease-out motion-reduce:max-[768px]:transition-none dark:max-[768px]:border-slate-800"
          :class="{
            'sidebar-open': sidebarOpen,
            'max-[768px]:translate-x-0': sidebarOpen
          }"
        >
          <AppNavigation />
        </div>
      </aside>

      <main
        class="main-content mobile-main-content max-[768px]:px-4 max-[768px]:pb-4 max-[768px]:pt-20"
      >
        <div class="content-container">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/userStore';
import AppNavigation from '@/components/AppNavigation.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppBrand from '@/components/AppBrand.vue';

const { t } = useI18n();

const sidebarOpen = ref(false);
const userStore = useUserStore();

// Toggle sidebar for mobile
const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// Close sidebar when clicking outside on mobile
const handleClickOutside = (event: MouseEvent) => {
  const sidebar = document.querySelector('.sidebar-content');
  const toggle = document.querySelector('.mobile-toggle');

  if (
    sidebarOpen.value &&
    sidebar &&
    toggle &&
    !sidebar.contains(event.target as Node) &&
    !toggle.contains(event.target as Node)
  ) {
    sidebarOpen.value = false;
  }
};

// Initialize
onMounted(() => {
  // Add click listener for mobile sidebar
  document.addEventListener('click', handleClickOutside);

  // Initialize user settings
  if (!userStore.isInitialized) {
    userStore.initialize();
  }
});

// Clean up event listeners
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.app-layout {
  @apply flex h-screen overflow-hidden;
}

.sidebar {
  @apply z-20 flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900;
}

.sidebar-header {
  @apply flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800;
}

.mobile-toggle {
  @apply items-center justify-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800;
}

.sidebar-content {
  @apply flex-1 overflow-y-auto bg-white dark:bg-slate-900;
}

.main-content {
  @apply flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 dark:bg-slate-950;
}

.content-container {
  @apply mx-auto max-w-7xl;
}
</style>
