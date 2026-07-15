import { describe, it, expect } from 'vitest';
import { subscriptionMatchesEvent, matchingSubscriptions } from './matcher';
import type { NormalizedEvent } from './providers/types';
import type { LocalSubscription } from './subscriptions';

function ev(over: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    provider: 'AWS',
    external_id: 'x',
    title: 'EC2 API errors',
    body: null,
    severity: 'major',
    region: 'us-east-1',
    service_key: null,
    service_name: null,
    source_url: null,
    started_at: null,
    ...over
  };
}

function sub(over: Partial<LocalSubscription> = {}): LocalSubscription {
  return {
    id: 's1',
    name: 'rule',
    providers: [],
    regions: [],
    services: [],
    minSeverity: 'minor',
    browser: true,
    createdAt: 0,
    ...over
  };
}

describe('subscriptionMatchesEvent', () => {
  it('empty rule matches any event at/above min severity', () => {
    expect(subscriptionMatchesEvent(ev(), sub())).toBe(true);
  });

  it('filters below min severity', () => {
    expect(subscriptionMatchesEvent(ev({ severity: 'info' }), sub({ minSeverity: 'major' }))).toBe(
      false
    );
    expect(
      subscriptionMatchesEvent(ev({ severity: 'critical' }), sub({ minSeverity: 'major' }))
    ).toBe(true);
  });

  it('matches provider list (case-insensitive)', () => {
    expect(subscriptionMatchesEvent(ev({ provider: 'AWS' }), sub({ providers: ['aws'] }))).toBe(
      true
    );
    expect(subscriptionMatchesEvent(ev({ provider: 'GCP' }), sub({ providers: ['AWS'] }))).toBe(
      false
    );
  });

  it('matches region fuzzily and rejects when event has no region', () => {
    expect(
      subscriptionMatchesEvent(ev({ region: 'us-east-1' }), sub({ regions: ['us-east'] }))
    ).toBe(true);
    expect(subscriptionMatchesEvent(ev({ region: null }), sub({ regions: ['us-east-1'] }))).toBe(
      false
    );
  });

  it('matches service keywords against title/service fields', () => {
    expect(subscriptionMatchesEvent(ev({ title: 'S3 latency' }), sub({ services: ['s3'] }))).toBe(
      true
    );
    expect(subscriptionMatchesEvent(ev({ title: 'EC2 errors' }), sub({ services: ['s3'] }))).toBe(
      false
    );
  });

  it('matchingSubscriptions returns only matching rules', () => {
    const subs = [sub({ id: 'a', providers: ['AWS'] }), sub({ id: 'b', providers: ['GCP'] })];
    const matched = matchingSubscriptions(ev({ provider: 'AWS' }), subs);
    expect(matched.map(s => s.id)).toEqual(['a']);
  });
});
