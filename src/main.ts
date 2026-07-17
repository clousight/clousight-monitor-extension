import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n, setGlobalLocale, translateRouteTitle } from './i18n';
import { useUserStore } from './stores/userStore';
import { bootstrapTheme } from './utils/themeBootstrap';

function syncRouteDocumentTitle(): void {
  const to = router.currentRoute.value;
  const titleKey = to.meta.titleKey;
  const pageTitle = titleKey ? translateRouteTitle(titleKey) : translateRouteTitle('app.brand');
  document.title = `${pageTitle} | ${translateRouteTitle('app.titleSuffix')}`;
}

async function bootstrap(): Promise<void> {
  await bootstrapTheme();

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);

  const userStore = useUserStore();
  await userStore.initialize();
  setGlobalLocale(userStore.settings.localePreference);

  app.use(router);
  app.mount('#app');

  watch(
    () => i18n.global.locale.value,
    () => {
      syncRouteDocumentTitle();
    }
  );
}

void bootstrap();
