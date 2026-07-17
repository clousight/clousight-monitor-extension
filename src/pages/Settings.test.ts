import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { requestProviderOrigin } from '@/services/permissions';
import { PROVIDERS } from '@/services/providers/registry';
import { useUserStore } from '@/stores/userStore';
import Settings from './Settings.vue';

vi.mock('@/services/permissions', () => ({
  requestProviderOrigin: vi.fn(),
  removeProviderOrigin: vi.fn()
}));

vi.mock('@/services/llm', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/llm')>();
  return {
    ...actual,
    getLlmConfig: vi.fn().mockResolvedValue({ ...actual.DEFAULT_LLM_CONFIG }),
    saveLlmConfig: vi.fn().mockResolvedValue(undefined)
  };
});

describe('Settings appearance and About sections', () => {
  const storageSet = vi.fn((_data: unknown, callback?: () => void) => callback?.());

  beforeEach(() => {
    i18n.global.locale.value = 'en';
    storageSet.mockClear();
    vi.mocked(requestProviderOrigin).mockReset();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'clousight-test',
        getManifest: () => ({ version: '7.6.5' })
      },
      storage: {
        sync: {
          get: (_keys: string[], callback: (data: unknown) => void) =>
            callback({ settings: { theme: 'light' } }),
          set: storageSet
        }
      }
    });
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  async function mountSettings() {
    const pinia = createPinia();
    setActivePinia(pinia);
    const userStore = useUserStore();
    const wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs: { RouterLink: RouterLinkStub }
      }
    });
    await flushPromises();
    return { wrapper, userStore };
  }

  it('uses the real store action to apply and persist accessible theme choices', async () => {
    const { wrapper } = await mountSettings();

    const fieldset = wrapper.get('fieldset');
    expect(fieldset.get('legend').text()).toBe('Appearance');

    const themeInputs = wrapper.findAll<HTMLInputElement>('input[name="theme"]');
    expect(themeInputs.map(input => input.attributes('value'))).toEqual([
      'light',
      'dark',
      'system'
    ]);
    expect(themeInputs.map(input => input.element.checked)).toEqual([true, false, false]);

    await themeInputs[1].trigger('change');
    await flushPromises();
    expect(themeInputs.map(input => input.element.checked)).toEqual([false, true, false]);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(storageSet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ theme: 'dark' })
      }),
      expect.any(Function)
    );

    await themeInputs[0].trigger('change');
    await flushPromises();
    expect(themeInputs.map(input => input.element.checked)).toEqual([true, false, false]);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(storageSet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ theme: 'light' })
      }),
      expect.any(Function)
    );

    expect(wrapper.text()).toContain('Version: 7.6.5');
    expect(wrapper.text()).toContain('Status data comes from providers’ official public sources.');
    expect(wrapper.text()).toContain('No account, no server — all settings stay in your browser.');
  });

  it('keeps experimental providers disabled when permission is declined', async () => {
    vi.mocked(requestProviderOrigin).mockResolvedValue(false);
    const { wrapper, userStore } = await mountSettings();
    const experimentalIndex = PROVIDERS.findIndex(provider => provider.experimental);
    const experimentalProvider = PROVIDERS[experimentalIndex];
    const checkbox =
      wrapper.findAll<HTMLInputElement>('.provider-options input')[experimentalIndex];

    await checkbox.trigger('change');
    await flushPromises();

    expect(requestProviderOrigin).toHaveBeenCalledWith(experimentalProvider.code);
    expect(userStore.settings.providers).not.toContain(experimentalProvider.code);
    expect(checkbox.element.checked).toBe(false);
  });
});
