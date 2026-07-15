/**
 * Local subscription rules (filter rules) stored in chrome.storage.sync.
 * Replaces the former server-side user_subscriptions table — no account, no server.
 */

import type { Severity } from './providers/types';

export const SUBSCRIPTION_RULE_MAX = 10;
const STORAGE_KEY = 'subscriptions';

export interface LocalSubscription {
  id: string;
  name: string;
  /** Empty array = all providers. Values are provider codes (e.g. "AWS"). */
  providers: string[];
  /** Empty array = all regions. */
  regions: string[];
  /** Empty array = all services. Free-text matched against title/service name. */
  services: string[];
  minSeverity: Severity;
  /** Notify via a browser notification when a matching incident appears. */
  browser: boolean;
  createdAt: number;
}

export type SubscriptionInput = Omit<LocalSubscription, 'id' | 'createdAt'>;

function hasSync(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.sync;
}

function newId(): string {
  return `sub-${Date.now().toString(36)}-${Math.floor(performance.now() % 1e6).toString(36)}`;
}

export async function getSubscriptions(): Promise<LocalSubscription[]> {
  if (hasSync()) {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as LocalSubscription[]) ?? [];
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LocalSubscription[];
  } catch {
    return [];
  }
}

async function writeAll(list: LocalSubscription[]): Promise<void> {
  if (hasSync()) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: list });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export async function addSubscription(input: SubscriptionInput): Promise<LocalSubscription> {
  const list = await getSubscriptions();
  if (list.length >= SUBSCRIPTION_RULE_MAX) {
    throw new Error(`Subscription limit reached (${SUBSCRIPTION_RULE_MAX})`);
  }
  const sub: LocalSubscription = { ...input, id: newId(), createdAt: Date.now() };
  await writeAll([...list, sub]);
  return sub;
}

export async function updateSubscription(
  id: string,
  patch: Partial<SubscriptionInput>
): Promise<void> {
  const list = await getSubscriptions();
  await writeAll(list.map(s => (s.id === id ? { ...s, ...patch } : s)));
}

export async function deleteSubscription(id: string): Promise<void> {
  const list = await getSubscriptions();
  await writeAll(list.filter(s => s.id !== id));
}
