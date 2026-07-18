import { describe, expect, it } from 'vitest';
import {
  CASCADE_PROVIDER_CODES,
  getProviderCatalog,
  getRegionOptions,
  getServiceOptions,
  supportsCascade
} from './catalog';

describe('provider catalog', () => {
  it('exposes AWS regions with no service catalog', () => {
    const aws = getProviderCatalog('AWS');
    expect(aws).not.toBeNull();
    expect(aws?.regions).toContain('us-east-1');
    expect(aws?.services).toEqual([]);
  });

  it('exposes Alibaba regions and services with case-insensitive lookup', () => {
    const ali = getProviderCatalog('alibaba');
    expect(ali?.regions).toContain('cn-hangzhou');
    expect(ali?.services).toContain('ECS');
  });

  it('returns null for providers without a cascade catalog', () => {
    expect(getProviderCatalog('GCP')).toBeNull();
    expect(getProviderCatalog('unknown')).toBeNull();
  });

  it('unions, dedupes and sorts region options across providers', () => {
    const opts = getRegionOptions(['AWS', 'ALIBABA']);
    expect(opts).toEqual([...opts].sort());
    expect(new Set(opts).size).toBe(opts.length);
    expect(opts).toContain('us-east-1');
    expect(opts).toContain('cn-hangzhou');
  });

  it('takes service options only from providers that define services', () => {
    expect(getServiceOptions(['AWS'])).toEqual([]);
    expect(getServiceOptions(['ALIBABA'])).toContain('ECS');
  });

  it('supports cascade only when every selected provider is data-backed', () => {
    expect(supportsCascade(['AWS'])).toBe(true);
    expect(supportsCascade(['AWS', 'ALIBABA'])).toBe(true);
    expect(supportsCascade([])).toBe(false);
    expect(supportsCascade(['GCP'])).toBe(false);
    expect(supportsCascade(['AWS', 'GCP'])).toBe(false);
    expect(CASCADE_PROVIDER_CODES).toContain('AWS');
  });
});
