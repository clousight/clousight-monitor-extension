<template>
  <div class="app-container" :class="{ dark: isDarkMode }">
    <div class="app-layout">
      <aside class="sidebar">
        <div class="sidebar-header">
          <AppBrand compact class="sidebar-brand" />
          <button
            type="button"
            class="mobile-toggle"
            :aria-expanded="sidebarOpen"
            aria-controls="sidebar-nav-panel"
            :aria-label="sidebarOpen ? t('nav.closeMenu') : t('nav.openMenu')"
            @click="toggleSidebar"
          >
            <AppIcon :name="sidebarOpen ? 'close' : 'menu'" size="1.5rem" />
          </button>
        </div>

        <div
          id="sidebar-nav-panel"
          class="sidebar-content"
          :class="{ 'sidebar-open': sidebarOpen }"
        >
          <AppNavigation />
        </div>
      </aside>

      <main class="main-content">
        <div class="content-container">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeUnmount } from 'vue';
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

// Get dark mode status from user store
const isDarkMode = computed(() => {
  return userStore.effectiveTheme === 'dark';
});

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
.app-container {
  @apply bg-slate-50 text-slate-800 min-h-screen;
}

.app-container.dark {
  @apply bg-slate-900 text-slate-100;
}

.app-layout {
  @apply flex h-screen overflow-hidden;
}

.sidebar {
  @apply w-64 flex-shrink-0 h-full bg-white border-r border-slate-200 flex flex-col z-20;
}

.app-container.dark .sidebar {
  @apply bg-slate-800 border-slate-700;
}

.sidebar-header {
  @apply flex justify-between items-center h-16 px-4 border-b border-slate-200;
}

.app-container.dark .sidebar-header {
  @apply border-slate-700;
}

.mobile-toggle {
  @apply hidden min-h-[44px] min-w-[44px] items-center justify-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800;
}

.sidebar-content {
  @apply flex-1 overflow-y-auto;
}

.main-content {
  @apply flex-1 overflow-y-auto bg-slate-50 p-6;
}

.app-container.dark .main-content {
  @apply bg-slate-900;
}

.content-container {
  @apply max-w-7xl mx-auto;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .sidebar {
    @apply w-16;
  }

  .sidebar-brand :deep([data-brand-text]) {
    @apply hidden;
  }

  .mobile-toggle {
    @apply flex;
  }

  .sidebar-content {
    @apply fixed top-16 left-0 w-64 bottom-0 bg-white transform -translate-x-full transition-transform duration-200 ease-out motion-reduce:transition-none;
  }

  .app-container.dark .sidebar-content {
    @apply bg-slate-800;
  }

  .sidebar-content.sidebar-open {
    @apply translate-x-0;
  }

  .main-content {
    @apply p-4;
  }
}
</style>
