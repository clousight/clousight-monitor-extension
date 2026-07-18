import { describe, expect, it } from 'vitest';
import type { ServiceStatus, StatusType } from '@/types/status';
import { deriveOverallHealth, deriveProviderSummaries } from './statusSummary';

function service(provider: string, status: StatusType, region = 'global'): ServiceStatus {
  return {
    id: `${provider}-${status}-${region}`,
    provider,
    serviceId: 'service',
    serviceName: 'Service',
    region,
    status,
    updatedAt: 1
  };
}

describe('statusSummary', () => {
  it('aggregates each provider and keeps the worst status', () => {
    const rows = deriveProviderSummaries([
      service('AWS', 'operational', 'us-east-1'),
      service('AWS', 'degraded', 'eu-west-1'),
      service('GCP', 'maintenance')
    ]);
    expect(rows[0]).toMatchObject({
      code: 'AWS',
      name: 'Amazon Web Services',
      worst: 'degraded',
      total: 2,
      regions: 2
    });
    expect(rows[1]).toMatchObject({ code: 'GCP', worst: 'maintenance' });
  });

  it('sorts incidents before operational providers', () => {
    const rows = deriveProviderSummaries([
      service('AWS', 'operational'),
      service('GCP', 'outage'),
      service('AZURE', 'degraded')
    ]);
    expect(rows.map(row => row.code)).toEqual(['GCP', 'AZURE', 'AWS']);
  });

  it('uses official names and status-page URLs from the registry', () => {
    const [summary] = deriveProviderSummaries([service('AWS', 'operational')]);
    expect(summary.name).toBe('Amazon Web Services');
    expect(summary.statusPageUrl).toBe('https://health.aws.amazon.com/health/status');
  });

  it('derives provider-level overall health', () => {
    const health = deriveOverallHealth(
      deriveProviderSummaries([
        service('AWS', 'operational'),
        service('GCP', 'outage'),
        service('AZURE', 'operational')
      ])
    );
    expect(health).toEqual({
      total: 3,
      operational: 2,
      degraded: 0,
      outage: 1,
      maintenance: 0,
      affected: 1,
      worst: 'outage'
    });
  });

  it('returns a neutral empty summary', () => {
    expect(deriveOverallHealth([])).toEqual({
      total: 0,
      operational: 0,
      degraded: 0,
      outage: 0,
      maintenance: 0,
      affected: 0,
      worst: null
    });
  });
});

function richService(
  provider: string,
  status: StatusType,
  extra: Partial<ServiceStatus> = {}
): ServiceStatus {
  return { ...service(provider, status), ...extra };
}

describe('statusSummary incident headlines', () => {
  it('prefers statusMessage, then incident.title, then serviceName', () => {
    const [byMessage] = deriveProviderSummaries([
      richService('AWS', 'outage', {
        statusMessage: 'Elevated API errors',
        serviceName: 'EC2',
        incident: { id: 'i1', title: 'EC2 disruption', startTime: 1 }
      })
    ]);
    expect(byMessage.headline).toBe('Elevated API errors');

    const [byIncident] = deriveProviderSummaries([
      richService('GCP', 'outage', {
        serviceName: 'Compute Engine',
        incident: { id: 'i2', title: 'Networking incident', startTime: 1 }
      })
    ]);
    expect(byIncident.headline).toBe('Networking incident');

    const [byName] = deriveProviderSummaries([
      richService('AZURE', 'degraded', { serviceName: 'Azure SQL' })
    ]);
    expect(byName.headline).toBe('Azure SQL');
  });

  it('prefers the event sourceUrl and falls back to the registry status page', () => {
    const [withSource] = deriveProviderSummaries([
      richService('AWS', 'outage', { sourceUrl: 'https://status.example/incident/1' })
    ]);
    expect(withSource.incidentSourceUrl).toBe('https://status.example/incident/1');

    const [withoutSource] = deriveProviderSummaries([
      richService('AWS', 'outage', { statusMessage: 'Something broke' })
    ]);
    expect(withoutSource.incidentSourceUrl).toBe('https://health.aws.amazon.com/health/status');
  });

  it('selects the most severe active event, newest breaking ties', () => {
    const [bySeverity] = deriveProviderSummaries([
      richService('AWS', 'degraded', { statusMessage: 'Minor blip', updatedAt: 100 }),
      richService('AWS', 'outage', { statusMessage: 'Major outage', updatedAt: 1 })
    ]);
    expect(bySeverity.headline).toBe('Major outage');

    const [byRecency] = deriveProviderSummaries([
      richService('GCP', 'degraded', { statusMessage: 'Older event', updatedAt: 10 }),
      richService('GCP', 'degraded', { statusMessage: 'Newer event', updatedAt: 20 })
    ]);
    expect(byRecency.headline).toBe('Newer event');
  });

  it('never emits a headline or incident link for operational providers', () => {
    const [summary] = deriveProviderSummaries([
      richService('AWS', 'operational', {
        statusMessage: 'Should be ignored',
        sourceUrl: 'https://ignored.example'
      })
    ]);
    expect(summary.headline).toBeUndefined();
    expect(summary.incidentSourceUrl).toBeUndefined();
  });
});
