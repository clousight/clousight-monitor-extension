import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyThemeClass, loadStoredTheme, resolveTheme } from './themeBootstrap';

describe('themeBootstrap', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('resolves explicit and system themes', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('applies the root class and color scheme', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));

    applyThemeClass('system');

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('reads the same settings object used by userStore', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: (_keys: string[], callback: (data: unknown) => void) =>
            callback({ settings: { theme: 'dark' } })
        }
      }
    });

    await expect(loadStoredTheme()).resolves.toBe('dark');
  });

  it('falls back to local storage outside the extension runtime', async () => {
    localStorage.setItem('settings', JSON.stringify({ theme: 'system' }));

    await expect(loadStoredTheme()).resolves.toBe('system');
  });

  it('starts one stable system-theme listener across repeated initialization', async () => {
    let changeListener: (() => void) | undefined;
    const addEventListener = vi.fn(
      (_event: string, listener: () => void) => (changeListener = listener)
    );
    const removeEventListener = vi.fn();
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      addEventListener,
      removeEventListener
    }));
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: (_keys: string[], callback: (data: unknown) => void) => callback({})
        }
      }
    });
    const { createPinia, setActivePinia } = await import('pinia');
    const { useUserStore } = await import('@/stores/userStore');
    setActivePinia(createPinia());
    const store = useUserStore();

    await store.initialize();
    await store.initialize();
    store.settings.theme = 'system';
    changeListener?.();

    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    store.stopSystemThemeSync();
    expect(removeEventListener).toHaveBeenCalledWith('change', changeListener);
  });
});
