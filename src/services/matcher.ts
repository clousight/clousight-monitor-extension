/**
 * Local event↔subscription matcher. Ported from the former server matcher; runs
 * in the extension against locally-stored subscription rules.
 */

import { meetsMinSeverity } from './providers/severity';
import type { NormalizedEvent } from './providers/types';
import type { LocalSubscription } from './subscriptions';

function norm(s: string): string {
  return s.trim().toUpperCase();
}

function matchesProvider(event: NormalizedEvent, sub: LocalSubscription): boolean {
  if (!sub.providers || sub.providers.length === 0) {
    return true;
  }
  const p = norm(event.provider);
  return sub.providers.some(x => norm(x) === p);
}

function matchesRegion(event: NormalizedEvent, sub: LocalSubscription): boolean {
  if (!sub.regions || sub.regions.length === 0) {
    return true;
  }
  if (!event.region) {
    return false;
  }
  const v = norm(event.region);
  return sub.regions.some(entry => {
    const e = norm(entry);
    return v.includes(e) || e.includes(v);
  });
}

function matchesServices(event: NormalizedEvent, sub: LocalSubscription): boolean {
  if (!sub.services || sub.services.length === 0) {
    return true;
  }
  const hay = [event.title, event.service_name, event.service_key]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
  return sub.services.some(s => hay.includes(norm(s)));
}

export function subscriptionMatchesEvent(event: NormalizedEvent, sub: LocalSubscription): boolean {
  return (
    meetsMinSeverity(event.severity, sub.minSeverity) &&
    matchesProvider(event, sub) &&
    matchesRegion(event, sub) &&
    matchesServices(event, sub)
  );
}

/** Returns the subscriptions that match a given event. */
export function matchingSubscriptions(
  event: NormalizedEvent,
  subs: LocalSubscription[]
): LocalSubscription[] {
  return subs.filter(sub => subscriptionMatchesEvent(event, sub));
}
