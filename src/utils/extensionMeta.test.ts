import { afterEach, describe, expect, it, vi } from 'vitest';
import { getExtensionVersion } from './extensionMeta';

describe('getExtensionVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the manifest version in extension pages', () => {
    vi.stubGlobal('chrome', { runtime: { getManifest: () => ({ version: '2.3.4' }) } });
    expect(getExtensionVersion()).toBe('2.3.4');
  });

  it('uses a development label outside the extension', () => {
    vi.stubGlobal('chrome', undefined);
    expect(getExtensionVersion()).toBe('dev');
  });
});
