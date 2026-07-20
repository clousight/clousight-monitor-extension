import { describe, it, expect } from 'vitest';
import { selectProviders } from './fetchSummary';
import { VERIFIED_PROVIDERS } from './registry';

describe('selectProviders', () => {
  it('defaults to verified providers when codes is undefined', () => {
    expect(selectProviders(undefined).map(p => p.code)).toEqual(
      VERIFIED_PROVIDERS.map(p => p.code)
    );
  });

  it('selects exactly the requested providers', () => {
    expect(selectProviders(['AWS']).map(p => p.code)).toEqual(['AWS']);
  });

  // Watching nothing must fetch nothing — not silently fall back to "all".
  it('selects nothing when codes is an empty array', () => {
    expect(selectProviders([])).toEqual([]);
  });
});
