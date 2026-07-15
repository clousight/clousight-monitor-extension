import { RouteRecordRaw } from 'vue-router';

// Layouts
import DefaultLayout from '@/layouts/DefaultLayout.vue';

// Pages
import Dashboard from '@/pages/Dashboard.vue';
import Providers from '@/pages/Providers.vue';
import Settings from '@/pages/Settings.vue';
import NotFound from '@/pages/NotFound.vue';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: Dashboard,
        meta: { title: 'Dashboard' }
      },
      {
        path: 'providers',
        name: 'providers',
        component: Providers,
        meta: { title: 'Cloud Providers' }
      },
      {
        path: 'settings',
        name: 'settings',
        component: Settings,
        meta: { title: 'Settings' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFound
  }
];
