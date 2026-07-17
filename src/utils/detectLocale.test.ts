import { describe, it, expect } from 'vitest';
import {
  migrateLegacyLocaleCode,
  resolveLocalePreference,
  SUPPORTED_LOCALES
} from './detectLocale';

describe('detectLocale', () => {
  it('resolves supported locales explicitly', () => {
    expect(resolveLocalePreference('en')).toBe('en');
    expect(resolveLocalePreference('zh-CN')).toBe('zh-CN');
  });

  it('maps browser region tags to the closest supported locale', () => {
    expect(migrateLegacyLocaleCode('en-US')).toBe('en');
    expect(migrateLegacyLocaleCode('en-GB')).toBe('en');
  });

  it('collapses all Chinese variants to Simplified Chinese', () => {
    expect(migrateLegacyLocaleCode('zh-CN')).toBe('zh-CN');
    expect(migrateLegacyLocaleCode('zh')).toBe('zh-CN');
    expect(migrateLegacyLocaleCode('zh-TW')).toBe('zh-CN');
    expect(migrateLegacyLocaleCode('zh-HK')).toBe('zh-CN');
  });

  it('falls back to en for unsupported languages and unknown tags', () => {
    expect(migrateLegacyLocaleCode('ja-JP')).toBe('en');
    expect(migrateLegacyLocaleCode('de-AT')).toBe('en');
    expect(migrateLegacyLocaleCode('xx-YY')).toBe('en');
  });

  it('auto resolves to a supported locale', () => {
    expect(SUPPORTED_LOCALES).toContain(resolveLocalePreference('auto'));
  });
});
