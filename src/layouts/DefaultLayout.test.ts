import { shallowMount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it, vi } from 'vitest';
import { cspMessageCompiler } from '@/i18n/messageCompiler';
import DefaultLayout from './DefaultLayout.vue';

vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    effectiveTheme: 'light',
    isInitialized: true,
    initialize: vi.fn()
  })
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messageCompiler: cspMessageCompiler,
  messages: {
    en: {
      nav: {
        openMenu: 'Open menu',
        closeMenu: 'Close menu'
      }
    }
  }
});

describe('DefaultLayout mobile navigation', () => {
  it('separates the full-width mobile header from its drawer and main content', () => {
    const wrapper = shallowMount(DefaultLayout, {
      global: { plugins: [i18n] }
    });

    const sidebar = wrapper.get('aside.sidebar');
    const header = sidebar.get('header.mobile-top-header');
    const toggle = header.get('button.mobile-toggle');
    const drawer = sidebar.get('#sidebar-nav-panel.mobile-drawer');

    expect(header.get('app-brand-stub').attributes('compact')).toBe('true');
    expect(toggle.classes()).toEqual(expect.arrayContaining(['min-h-[44px]', 'min-w-[44px]']));
    expect(toggle.attributes('aria-controls')).toBe('sidebar-nav-panel');
    expect(header.element.nextElementSibling).toBe(drawer.element);
    expect(wrapper.get('main.mobile-main-content').element.tagName).toBe('MAIN');
  });
});
