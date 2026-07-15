import { describe, it, expect } from 'vitest';
import {
  migrateLegacyLocaleCode,
  resolveLocalePreference,
  SUPPORTED_LOCALES
} from './detectLocale';

describe('detectLocale', () => {
  it('resolves supported locales explicitly', () => {
    expect(resolveLocalePreference('zh-CN')).toBe('zh-CN');
    expect(resolveLocalePreference('ja')).toBe('ja');
    expect(resolveLocalePreference('pt-BR')).toBe('pt-BR');
  });

  it('maps browser region tags to the closest supported locale', () => {
    expect(migrateLegacyLocaleCode('ja-JP')).toBe('ja');
    expect(migrateLegacyLocaleCode('pt-PT')).toBe('pt-BR');
    expect(migrateLegacyLocaleCode('de-AT')).toBe('de');
  });

  it('distinguishes Traditional from Simplified Chinese', () => {
    expect(migrateLegacyLocaleCode('zh-TW')).toBe('zh-Hant');
    expect(migrateLegacyLocaleCode('zh-HK')).toBe('zh-Hant');
    expect(migrateLegacyLocaleCode('zh-CN')).toBe('zh-CN');
    expect(migrateLegacyLocaleCode('zh')).toBe('zh-CN');
  });

  it('falls back to en for unknown tags', () => {
    expect(migrateLegacyLocaleCode('xx-YY')).toBe('en');
  });

  it('auto resolves to a supported locale', () => {
    expect(SUPPORTED_LOCALES).toContain(resolveLocalePreference('auto'));
  });
});
