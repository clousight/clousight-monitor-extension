import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useStatusStore } from '@/stores/statusStore';
import { useUserStore } from '@/stores/userStore';
import type { ServiceStatus } from '@/types/status';
import ProviderLogo from '@/components/ProviderLogo.vue';
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

  it('declares a fixed popup shell width before bundled CSS loads', () => {
    const { wrapper } = setup();
    const root = wrapper.get('[data-testid="popup-root"]');
    const popupHtml = fs.readFileSync(path.resolve(process.cwd(), 'popup.html'), 'utf8');

    expect(root.classes()).toContain('w-[360px]');
    expect(root.classes()).not.toContain('max-w-[100vw]');
    expect(popupHtml).toMatch(/<body[^>]+style="[^"]*width:\s*360px[^"]*"/);
  });

  it('shows official provider names, provider health, and official-source wording', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational'), service('GCP', 'degraded')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();

    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('Clousight');
    expect(wrapper.text()).toContain('1 of 2 providers operational');
    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('Google Cloud');
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

  it('uses singular grammar when exactly one provider needs attention', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational'), service('GCP', 'outage')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();

    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('1 provider needs attention');
    expect(wrapper.text()).not.toContain('1 providers need attention');
  });

  it('uses plural grammar when more than one provider needs attention', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'outage'), service('GCP', 'degraded')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();

    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    expect(wrapper.text()).toContain('2 providers need attention');
  });

  it('shows a fatal error with a working retry when no retained data exists', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    const longError = `https://status.example.invalid/${'runtime-token'.repeat(24)}`;
    store.error = longError;
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const refresh = vi.spyOn(store, 'refreshStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    const error = wrapper.get('[data-testid="popup-fatal-error"]');
    expect(error.text()).toContain(longError);
    expect(error.classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'overflow-hidden', 'break-words'])
    );
    expect(wrapper.text()).toContain('Try again');

    const retry = wrapper.get('button[data-testid="popup-retry"]');
    expect(retry.classes()).toContain('min-w-[44px]');
    await retry.trigger('click');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('keeps retained provider data visible alongside a refresh warning', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational')];
    const longError = `runtime://${'unbroken-token'.repeat(24)}`;
    store.error = longError;
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, {
      global: { plugins: [pinia, i18n] }
    });

    const warning = wrapper.get('[data-testid="popup-retained-warning"]');
    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(warning.text()).toContain(longError);
    expect(warning.classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'overflow-hidden', 'break-words'])
    );
    expect(wrapper.text()).not.toContain('Try again');
  });

  it('renders a provider logo for every row', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational'), service('GCP', 'degraded')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    expect(wrapper.findAll('[data-testid="popup-row"]')).toHaveLength(2);
    expect(wrapper.findAllComponents(ProviderLogo)).toHaveLength(2);
  });

  it('shows one incident headline and a secure official link for abnormal rows', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [
      {
        ...service('AWS', 'outage'),
        statusMessage: 'Elevated error rates in us-east-1',
        sourceUrl: 'https://status.example/aws/incident-1'
      }
    ];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    expect(wrapper.get('[data-testid="incident-headline"]').text()).toBe(
      'Elevated error rates in us-east-1'
    );
    const link = wrapper.get('[data-testid="incident-link"]');
    expect(link.attributes('href')).toBe('https://status.example/aws/incident-1');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });

  it('shows how long an incident has been ongoing on abnormal rows', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [
      {
        ...service('AWS', 'outage'),
        statusMessage: 'Elevated error rates',
        incident: {
          id: 'i1',
          title: 'Elevated error rates',
          startTime: Date.now() - 2 * 60 * 60 * 1000
        }
      }
    ];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    expect(wrapper.get('[data-testid="incident-since"]').text()).toContain('2 hours ago');
  });

  it('falls back to the official status page when an event has no deep link', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [{ ...service('GCP', 'degraded'), statusMessage: 'Networking degraded' }];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    expect(wrapper.get('[data-testid="incident-link"]').attributes('href')).toBe(
      'https://status.cloud.google.com/'
    );
  });

  it('shows no incident headline or link for operational providers', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useStatusStore();
    store.services = [service('AWS', 'operational')];
    vi.spyOn(store, 'fetchStatus').mockResolvedValue();
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    expect(wrapper.find('[data-testid="incident-headline"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="incident-link"]').exists()).toBe(false);
  });

  it('lets the user change the auto-refresh interval from the popup', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const status = useStatusStore();
    vi.spyOn(status, 'fetchStatus').mockResolvedValue();
    const user = useUserStore();
    user.settings.checkInterval = 5;
    const setCheckInterval = vi.spyOn(user, 'setCheckInterval').mockResolvedValue();

    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });
    const select = wrapper.get('[data-testid="popup-interval"]');
    expect((select.element as HTMLSelectElement).value).toBe('5');

    await select.setValue('15');
    expect(setCheckInterval).toHaveBeenCalledWith(15);
  });

  it('only lists and counts watched providers', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const status = useStatusStore();
    status.services = [service('AWS', 'operational'), service('GCP', 'operational')];
    vi.spyOn(status, 'fetchStatus').mockResolvedValue();
    const user = useUserStore();
    user.settings.providers = ['GCP']; // AWS unwatched

    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    const rows = wrapper.findAll('[data-testid="popup-row"]');
    expect(rows).toHaveLength(1);
    expect(wrapper.text()).toContain('Google Cloud');
    expect(wrapper.text()).not.toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('1 of 1 providers operational');
  });

  it('offers a quick language switch in the popup footer', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const status = useStatusStore();
    vi.spyOn(status, 'fetchStatus').mockResolvedValue();
    const user = useUserStore();
    const setLocale = vi.spyOn(user, 'setLocalePreference').mockImplementation(() => {});
    const wrapper = mount(PopupApp, { global: { plugins: [pinia, i18n] } });

    await wrapper.get('[data-testid="popup-lang-zh"]').trigger('click');
    expect(setLocale).toHaveBeenCalledWith('zh-CN');
    await wrapper.get('[data-testid="popup-lang-en"]').trigger('click');
    expect(setLocale).toHaveBeenCalledWith('en');
  });

  it('opens the dashboard and extension settings from popup actions', async () => {
    const { wrapper } = setup();

    await wrapper.get('button[data-testid="popup-dashboard"]').trigger('click');
    const settings = wrapper.get('button[data-testid="popup-settings"]');
    expect(settings.classes()).toContain('min-w-[44px]');
    await settings.trigger('click');

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'index.html' });
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});
