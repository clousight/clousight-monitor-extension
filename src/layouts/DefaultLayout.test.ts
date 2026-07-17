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
  it('uses the global dark class for the full-page shell', () => {
    const wrapper = shallowMount(DefaultLayout, {
      global: { plugins: [i18n] }
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'min-h-screen',
        'bg-slate-50',
        'text-slate-900',
        'dark:bg-slate-950',
        'dark:text-slate-100'
      ])
    );
    expect(wrapper.classes()).not.toContain('app-container');
  });

  it('separates the full-width mobile header from its drawer and main content', () => {
    const wrapper = shallowMount(DefaultLayout, {
      global: { plugins: [i18n] }
    });

    const sidebar = wrapper.get('aside.sidebar');
    const header = sidebar.get('header.mobile-top-header');
    const brand = header.get('app-brand-stub');
    const toggle = header.get('button.mobile-toggle');
    const drawer = sidebar.get('#sidebar-nav-panel.mobile-drawer');
    const main = wrapper.get('main.mobile-main-content');

    expect(sidebar.classes()).toEqual(
      expect.arrayContaining([
        'w-64',
        'max-[768px]:fixed',
        'max-[768px]:inset-x-0',
        'max-[768px]:top-0',
        'max-[768px]:h-16',
        'max-[768px]:w-full',
        'max-[768px]:border-r-0'
      ])
    );
    expect(header.classes()).toContain('max-[768px]:w-full');
    expect(brand.attributes('compact')).toBe('true');
    expect(brand.classes()).toEqual(
      expect.arrayContaining(['max-[768px]:min-w-0', 'max-[768px]:flex-1'])
    );
    expect(toggle.classes()).toEqual(
      expect.arrayContaining([
        'hidden',
        'min-h-[44px]',
        'min-w-[44px]',
        'max-[768px]:flex',
        'max-[768px]:shrink-0'
      ])
    );
    expect(toggle.attributes('aria-controls')).toBe('sidebar-nav-panel');
    expect(drawer.classes()).toEqual(
      expect.arrayContaining([
        'max-[768px]:fixed',
        'max-[768px]:top-16',
        'max-[768px]:bottom-0',
        'max-[768px]:left-0',
        'max-[768px]:w-64'
      ])
    );
    expect(header.element.nextElementSibling).toBe(drawer.element);
    expect(main.classes()).toEqual(
      expect.arrayContaining(['max-[768px]:px-4', 'max-[768px]:pb-4', 'max-[768px]:pt-20'])
    );
  });
});
