import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useStatusStore } from '@/stores/statusStore';
import type { ServiceStatus } from '@/types/status';
import PopupApp from './PopupApp.vue';

function service(
  provider: string,
  status: ServiceStatus['status'],
  id = provider.toLowerCase()
): ServiceStatus {
  return {
    id,
    provider,
    serviceId: `${id}-service`,
    serviceName: `${provider} Service`,
    region: 'global',
    status,
    updatedAt: Date.now()
  };
}

function setup() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useStatusStore();
  vi.spyOn(store, 'fetchStatus').mockResolvedValue();
  const wrapper = mount(PopupApp, {
    global: { plugins: [pinia, i18n] }
  });
  return { store, wrapper };
}

describe('PopupApp', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    vi.stubGlobal('chrome', {
      runtime: {
        getManifest: () => ({ version: '0.1.0' }),
        openOptionsPage: vi.fn(),
        getURL: (path: string) => path
      },
      tabs: { create: vi.fn() }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows official provider names, provider health, and official-source wording', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational'), service('CLOUDFLARE', 'degraded')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();

    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('Clousight');
    expect(wrapper.text()).toContain('1 of 2 providers operational');
    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('Cloudflare');
    expect(wrapper.text()).toContain('Operational');
    expect(wrapper.text()).toContain('Degraded');
    expect(wrapper.text()).toContain('Data from providers’ official status sources');
    expect(wrapper.text()).toContain('v0.1.0');
    expect(wrapper.text()).not.toContain('local mock data');
    expect(wrapper.text()).not.toContain('本地模拟数据');
  });

  it('shows the official-source loading state before the first result', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.loading = true;
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();

    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('Checking official status sources…');
    expect(wrapper.text()).not.toContain('No provider status is available yet.');
  });

  it('shows an empty state when no provider status is available', () => {
    const { wrapper } = setup();

    expect(wrapper.text()).toContain('No provider status is available yet.');
  });

  it('shows a fatal error with a working retry when no retained data exists', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.error = 'Official status sources are unavailable';
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const refresh = vi.spyOn(store, 'refreshStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('Official status sources are unavailable');
    expect(wrapper.text()).toContain('Try again');

    await wrapper.get('button[data-testid="popup-retry"]').trigger('click');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('keeps retained provider data visible alongside a refresh warning', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational')];
    store.error = 'Refresh failed; showing retained data';
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('Refresh failed; showing retained data');
    expect(wrapper.text()).not.toContain('Try again');
  });

  it('opens the dashboard and extension settings from popup actions', async () => {
    const { wrapper } = setup();

    await wrapper.get('button[data-testid="popup-dashboard"]').trigger('click');
    await wrapper.get('button[data-testid="popup-settings"]').trigger('click');

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'index.html' });
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});
