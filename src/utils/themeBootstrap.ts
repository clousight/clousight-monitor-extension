export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

function normalizeTheme(theme: unknown): ThemePreference {
  return theme === 'dark' || theme === 'system' ? theme : 'light';
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): EffectiveTheme {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

export function applyThemeClass(theme: ThemePreference): void {
  const prefersDark =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveTheme = resolveTheme(theme, prefersDark);

  document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  document.documentElement.style.colorScheme = effectiveTheme;
}

export async function loadStoredTheme(): Promise<ThemePreference> {
  if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
    return new Promise(resolve => {
      chrome.storage.sync.get(['settings'], data => {
        const settings = (data as { settings?: { theme?: unknown } }).settings;
        resolve(normalizeTheme(settings?.theme));
      });
    });
  }

  try {
    const settings = JSON.parse(localStorage.getItem('settings') ?? '{}') as {
      theme?: unknown;
    };
    return normalizeTheme(settings.theme);
  } catch {
    return 'light';
  }
}

export async function bootstrapTheme(): Promise<void> {
  applyThemeClass(await loadStoredTheme());
}
