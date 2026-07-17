import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import { cspMessageCompiler } from '@/i18n/messageCompiler';
import AppBrand from './AppBrand.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messageCompiler: cspMessageCompiler,
  messages: { 'zh-CN': { app: { brand: '云计算指北' } } }
});

describe('AppBrand', () => {
  it('uses the shared logo and localized brand', () => {
    const wrapper = mount(AppBrand, {
      props: { subtitle: '多云服务健康状态' },
      global: { plugins: [i18n] }
    });
    expect(wrapper.get('img').attributes('src')).toBe('/images/logo.svg');
    expect(wrapper.text()).toContain('云计算指北');
    expect(wrapper.text()).toContain('多云服务健康状态');
  });

  it('keeps the logo visible while compact', () => {
    const wrapper = mount(AppBrand, {
      props: { compact: true },
      global: { plugins: [i18n] }
    });
    expect(wrapper.get('img').classes()).toEqual(expect.arrayContaining(['h-8', 'w-8']));
    expect(wrapper.get('[data-brand-text]').text()).toBe('云计算指北');
  });
});
