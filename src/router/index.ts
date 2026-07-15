import { createRouter, createWebHashHistory } from 'vue-router';
import Dashboard from '@/pages/Dashboard.vue';
import Providers from '@/pages/Providers.vue';
import Settings from '@/pages/Settings.vue';
import Notifications from '@/pages/Notifications.vue';
import Subscriptions from '@/pages/Subscriptions.vue';
import NotFound from '@/pages/NotFound.vue';
import { translateRouteTitle } from '@/i18n';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { titleKey: 'routes.dashboard' }
  },
  {
    path: '/providers',
    name: 'Providers',
    component: Providers,
    meta: { titleKey: 'routes.providers' }
  },
  {
    path: '/providers/:id',
    name: 'ProviderDetail',
    component: () => import('@/pages/ProviderDetail.vue'),
    props: true,
    meta: { titleKey: 'routes.providerDetail' }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { titleKey: 'routes.notifications' }
  },
  {
    path: '/subscriptions',
    name: 'Subscriptions',
    component: Subscriptions,
    meta: { titleKey: 'routes.subscriptions' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { titleKey: 'routes.settings' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { titleKey: 'routes.notFound' }
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  const titleKey = to.meta.titleKey;
  const pageTitle = titleKey ? translateRouteTitle(titleKey) : translateRouteTitle('app.brand');
  document.title = `${pageTitle} | ${translateRouteTitle('app.titleSuffix')}`;
  next();
});

export default router;
