import { describe, expect, it } from 'vitest';
import { getProviderDisplayName, getProviderId, getProviderLogoUrl } from './providerDisplay';

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

  it('resolves a local logo url for providers with a bundled asset', () => {
    expect(getProviderLogoUrl('aws')).toBe('/images/providers/aws.svg');
    expect(getProviderLogoUrl('GCP')).toBe('/images/providers/gcp.svg');
    expect(getProviderLogoUrl('DIGITALOCEAN')).toBe('/images/providers/digitalocean.svg');
  });

  it('returns null when no local logo is bundled', () => {
    // Volcano has no square icon asset yet, so it uses the initial-letter fallback.
    expect(getProviderLogoUrl('volcano')).toBeNull();
    expect(getProviderLogoUrl('custom-cloud')).toBeNull();
  });
});
