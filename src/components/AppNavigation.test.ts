import { describe, expect, it } from 'vitest';
import navigationSource from './AppNavigation.vue?raw';

describe('AppNavigation styles', () => {
  it('keeps navigation targets accessible and visually aligned', () => {
    expect(navigationSource).toContain('min-h-[44px]');
    expect(navigationSource).toContain('focus-visible:ring-2');
    expect(navigationSource).toContain(
      'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
    );
  });

  it('does not retain styles for removed profile menus', () => {
    expect(navigationSource).not.toMatch(/\.user-(profile|avatar|menu|info|name|email)/);
    expect(navigationSource).not.toContain('.menu-item');
  });
});
