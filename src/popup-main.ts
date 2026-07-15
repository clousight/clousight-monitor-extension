import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PopupApp from './PopupApp.vue';
import './assets/tailwind.css';
import { i18n, setGlobalLocale } from './i18n';
import { useUserStore } from './stores/userStore';

async function bootstrap(): Promise<void> {
  const app = createApp(PopupApp);
  const pinia = createPinia();
  app.use(pinia);
  app.use(i18n);

  const userStore = useUserStore();
  await userStore.initialize();
  setGlobalLocale(userStore.settings.localePreference);

  app.mount('#app');
}

void bootstrap();
