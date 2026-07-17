import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useUserStore } from '@/stores/userStore';
import Settings from './Settings.vue';

vi.mock('@/services/llm', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/llm')>();
  return {
    ...actual,
    getLlmConfig: vi.fn().mockResolvedValue({ ...actual.DEFAULT_LLM_CONFIG }),
    saveLlmConfig: vi.fn().mockResolvedValue(undefined)
  };
});

describe('Settings appearance and About sections', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    vi.stubGlobal('chrome', {
      runtime: {
        getManifest: () => ({ version: '7.6.5' })
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('selects and changes all themes while showing manifest and privacy data', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const userStore = useUserStore();
    userStore.isInitialized = true;
    userStore.settings.theme = 'dark';
    vi.spyOn(userStore, 'loadSettings').mockResolvedValue();
    const setTheme = vi.spyOn(userStore, 'setTheme').mockImplementation(() => undefined);

    const wrapper = mount(Settings, {
      global: {
        plugins: [pinia, i18n],
        stubs: { RouterLink: RouterLinkStub }
      }
    });
    await flushPromises();

    const themeInputs = wrapper.findAll<HTMLInputElement>('input[name="theme"]');
    expect(themeInputs.map(input => input.attributes('value'))).toEqual([
      'light',
      'dark',
      'system'
    ]);
    expect(themeInputs.map(input => input.element.checked)).toEqual([false, true, false]);

    for (const input of themeInputs) {
      await input.trigger('change');
    }
    expect(setTheme.mock.calls.map(([theme]) => theme)).toEqual(['light', 'dark', 'system']);

    expect(wrapper.text()).toContain('Version: 7.6.5');
    expect(wrapper.text()).toContain('Status data comes from providers’ official public sources.');
    expect(wrapper.text()).toContain('No account, no server — all settings stay in your browser.');
  });
});
