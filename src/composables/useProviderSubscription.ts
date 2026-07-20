/**
 * Subscribe/unsubscribe providers to monitor. Shared by the Settings page and the
 * Providers page so the "only watch some providers" flow behaves identically:
 * experimental providers request their host permission on enable (from the click
 * gesture), and changes are persisted immediately to local storage.
 */
import { useUserStore } from '@/stores/userStore';
import { getProvider } from '@/services/providers/registry';
import { requestProviderOrigin, removeProviderOrigin } from '@/services/permissions';

export function useProviderSubscription() {
  const userStore = useUserStore();

  function isWatched(code: string): boolean {
    // Defensive: persisted settings can carry a non-array providers value; never
    // let that crash rendering (it's also normalized on load, see userStore).
    const list = userStore.settings.providers;
    return Array.isArray(list) && list.includes(code);
  }

  /**
   * Toggle a provider on/off. Returns true if it is watched after the call.
   * Enabling an experimental provider can be declined at the permission prompt,
   * in which case it stays off and this returns false.
   */
  async function toggle(code: string): Promise<boolean> {
    const list = userStore.settings.providers;
    if (list.includes(code)) {
      userStore.settings.providers = list.filter(c => c !== code);
      void removeProviderOrigin(code);
      await userStore.saveSettings();
      return false;
    }
    if (getProvider(code)?.experimental) {
      const granted = await requestProviderOrigin(code);
      if (!granted) {
        return false;
      }
    }
    userStore.settings.providers = [...list, code];
    await userStore.saveSettings();
    return true;
  }

  return { isWatched, toggle };
}
