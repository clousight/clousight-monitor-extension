import { describe, it, expect } from 'vitest';
import { createI18n } from 'vue-i18n';
import { cspMessageCompiler } from './messageCompiler';

/**
 * These tests double as the CSP guarantee: vue-i18n is aliased to its
 * runtime-only build (no built-in compiler), so if interpolation works here it
 * is our eval-free cspMessageCompiler doing the work — no `new Function`.
 */
describe('cspMessageCompiler', () => {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messageCompiler: cspMessageCompiler,
    messages: {
      en: {
        plain: 'All systems operational',
        named: 'Watching {name}',
        multi: '{count} of {max} rules used',
        list: 'hello {0} and {1}'
      }
    }
  });
  const t = i18n.global.t;

  it('renders a message with no placeholders verbatim', () => {
    expect(t('plain')).toBe('All systems operational');
  });

  it('interpolates a named placeholder', () => {
    expect(t('named', { name: 'AWS' })).toBe('Watching AWS');
  });

  it('interpolates multiple named placeholders', () => {
    expect(t('multi', { count: 3, max: 5 })).toBe('3 of 5 rules used');
  });

  it('interpolates positional placeholders', () => {
    expect(t('list', ['Alice', 'Bob'])).toBe('hello Alice and Bob');
  });

  it('renders a missing named value as empty, not the token', () => {
    expect(t('named', {})).toBe('Watching ');
  });
});
