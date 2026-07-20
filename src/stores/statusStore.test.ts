import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStatusStore } from './statusStore';

describe('statusStore.loadProviderCheckedAt', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads per-provider check timestamps written by the background worker', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'ext' },
      storage: {
        local: {
          get: (_keys: unknown, cb: (d: unknown) => void) =>
            cb({ providerCheckedAt: { AWS: 111, GCP: 222 } })
        }
      }
    });
    const store = useStatusStore();

    await store.loadProviderCheckedAt();

    expect(store.providerCheckedAt).toEqual({ AWS: 111, GCP: 222 });
  });

  it('leaves the map empty when storage has nothing yet', async () => {
    vi.stubGlobal('chrome', {
      runtime: { id: 'ext' },
      storage: { local: { get: (_keys: unknown, cb: (d: unknown) => void) => cb({}) } }
    });
    const store = useStatusStore();

    await store.loadProviderCheckedAt();

    expect(store.providerCheckedAt).toEqual({});
  });
});
