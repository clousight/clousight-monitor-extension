import { describe, it, expect } from 'vitest';
import { eventsToServiceStatuses } from './statusService';
import type { NormalizedEvent } from './providers/types';

function ev(over: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    provider: 'AWS',
    external_id: 'e1',
    title: 'Networking degraded',
    body: null,
    severity: 'minor',
    region: 'us-east-1',
    service_key: null,
    service_name: null,
    source_url: 'https://status.aws.amazon.com/#e1',
    started_at: '2026-07-01T00:00:00Z',
    ...over
  };
}

describe('eventsToServiceStatuses', () => {
  it('maps severity to status type', () => {
    const rows = eventsToServiceStatuses([ev({ severity: 'critical' })], ['AWS']);
    const incident = rows.find(r => r.id.startsWith('AWS-e1'));
    expect(incident?.status).toBe('outage');
  });

  it('carries the source URL through for the "view details" link', () => {
    const rows = eventsToServiceStatuses([ev()], ['AWS']);
    const incident = rows.find(r => r.id.startsWith('AWS-e1'));
    expect(incident?.sourceUrl).toBe('https://status.aws.amazon.com/#e1');
  });

  it('adds an operational placeholder for providers with no incidents', () => {
    const rows = eventsToServiceStatuses([ev({ provider: 'AWS' })], ['AWS', 'GCP']);
    const gcp = rows.find(r => r.provider === 'GCP');
    expect(gcp?.status).toBe('operational');
    // placeholder still links to the official status page
    expect(gcp?.sourceUrl).toBe('https://status.cloud.google.com/');
  });
});
