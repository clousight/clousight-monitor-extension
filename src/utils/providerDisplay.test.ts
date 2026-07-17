import { describe, expect, it } from 'vitest';
import { getProviderDisplayName, getProviderId } from './providerDisplay';

describe('providerDisplay', () => {
  it('uses the registry friendly name case-insensitively', () => {
    expect(getProviderDisplayName('aws')).toBe('Amazon Web Services');
    expect(getProviderDisplayName('ALIBABA')).toBe('Alibaba Cloud');
  });

  it('keeps an unknown provider readable', () => {
    expect(getProviderDisplayName('custom-cloud')).toBe('custom-cloud');
  });

  it('normalizes ids without changing the registry code', () => {
    expect(getProviderId('Google Cloud')).toBe('google-cloud');
    expect(getProviderId('AWS')).toBe('aws');
  });
});
