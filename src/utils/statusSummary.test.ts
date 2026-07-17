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
