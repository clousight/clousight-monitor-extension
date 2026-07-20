import { createPinia, setActivePinia } from 'pinia';
import { isReactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserStore } from './userStore';

describe('userStore.setCheckInterval', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('chrome', {
      storage: { sync: { set: vi.fn((_data: unknown, cb?: () => void) => cb?.()) } },
      runtime: { sendMessage: vi.fn() }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('stores the chosen interval and reschedules the background alarm', async () => {
    const store = useUserStore();

    await store.setCheckInterval(15);

    expect(store.settings.checkInterval).toBe(15);
    expect(chrome.storage.sync.set).toHaveBeenCalled();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'updateCheckInterval',
      interval: 15
    });
  });

  it('clamps out-of-range intervals to the 1–60 minute window', async () => {
    const store = useUserStore();

    await store.setCheckInterval(0);
    expect(store.settings.checkInterval).toBe(1);

    await store.setCheckInterval(999);
    expect(store.settings.checkInterval).toBe(60);
  });
});

describe('userStore.saveSettings persistence', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('writes a plain, structured-cloneable settings object (not a reactive proxy)', async () => {
    setActivePinia(createPinia());
    let captured: { settings?: unknown } = {};
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          set: vi.fn((data: { settings?: unknown }, cb?: () => void) => {
            captured = data;
            cb?.();
          })
        }
      }
    });
    const store = useUserStore();
    store.settings.providers = ['AWS'];

    await store.saveSettings();

    // A Vue reactive proxy throws DataCloneError in chrome.storage.set; the value
    // we persist must be a detached plain object.
    expect(isReactive(captured.settings)).toBe(false);
    expect(() => structuredClone(captured.settings)).not.toThrow();
    expect((captured.settings as { providers: string[] }).providers).toEqual(['AWS']);
  });
});

describe('userStore.loadSettings provider normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function stubStoredSettings(settings: unknown) {
    setActivePinia(createPinia());
    vi.stubGlobal('chrome', {
      storage: {
        sync: {
          get: (_keys: unknown, cb: (d: unknown) => void) => cb({ settings }),
          set: vi.fn((_d: unknown, cb?: () => void) => cb?.())
        }
      }
    });
  }

  it('recovers a non-array persisted providers into the default array', async () => {
    // Legacy/corrupted data: providers saved as an object, not an array.
    stubStoredSettings({ providers: { AWS: true, GCP: false } });
    const store = useUserStore();

    await store.loadSettings();

    expect(Array.isArray(store.settings.providers)).toBe(true);
    expect(store.settings.providers.length).toBeGreaterThan(0);
    // The normalized value must support the calls the UI makes.
    expect(() => store.settings.providers.includes('AWS')).not.toThrow();
  });

  it('drops non-string entries from a persisted providers array', async () => {
    stubStoredSettings({ providers: ['AWS', 123, null, 'GCP'] });
    const store = useUserStore();

    await store.loadSettings();

    expect(store.settings.providers).toEqual(['AWS', 'GCP']);
  });

  it('keeps a valid persisted providers array as-is', async () => {
    stubStoredSettings({ providers: ['AWS'] });
    const store = useUserStore();

    await store.loadSettings();

    expect(store.settings.providers).toEqual(['AWS']);
  });
});
