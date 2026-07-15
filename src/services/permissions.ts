/**
 * On-demand host permissions. Verified providers are granted at install time;
 * experimental providers live in optional_host_permissions and are requested
 * only when the user enables them (from a user gesture in Settings).
 */

import { getProvider } from './providers/registry';

function hasPermissionsApi(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.permissions;
}

/** True if the extension may fetch this provider's origin. */
export async function hasProviderOrigin(code: string): Promise<boolean> {
  const def = getProvider(code);
  if (!def) {
    return false;
  }
  if (!hasPermissionsApi()) {
    return true; // dev / non-extension context
  }
  return chrome.permissions.contains({ origins: [def.origin] });
}

/** Request access to a provider's origin. Must be called from a user gesture. */
export async function requestProviderOrigin(code: string): Promise<boolean> {
  const def = getProvider(code);
  if (!def) {
    return false;
  }
  if (!hasPermissionsApi()) {
    return true;
  }
  return chrome.permissions.request({ origins: [def.origin] });
}

/** Best-effort release of an optional origin (no-op for install-time origins). */
export async function removeProviderOrigin(code: string): Promise<void> {
  const def = getProvider(code);
  if (!def || !hasPermissionsApi()) {
    return;
  }
  try {
    await chrome.permissions.remove({ origins: [def.origin] });
  } catch {
    /* install-time origins can't be removed; ignore */
  }
}
