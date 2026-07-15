import { describe, it, expect } from 'vitest';
import { parseAlibaba } from './alibaba';
import { parseTencent } from './tencent';

describe('parseAlibaba', () => {
  it('returns [] when no incidents are in progress', () => {
    expect(parseAlibaba({ data: [], total: 0, success: true })).toEqual([]);
    expect(parseAlibaba({})).toEqual([]);
  });

  it('emits an event per in-progress incident and never marks it operational', () => {
    const events = parseAlibaba({
      data: [
        { title: 'ECS API errors', description: 'Investigating', regionId: 'cn-hangzhou', id: 'e1' }
      ],
      success: true
    });
    expect(events).toHaveLength(1);
    expect(events[0].provider).toBe('ALIBABA');
    expect(events[0].region).toBe('cn-hangzhou');
    expect(events[0].severity).not.toBe('info'); // in-progress must not read as operational
    expect(events[0].source_url).toBe('https://status.alibabacloud.com/');
  });
});

describe('parseTencent', () => {
  it('returns [] when the banner is NORMAL and not shown', () => {
    const json = {
      Response: { Data: { Id: 47, Desc: 'All restored.', Status: 'NORMAL', IsShow: false } }
    };
    expect(parseTencent(json)).toEqual([]);
  });

  it('emits an event when a banner is shown / abnormal', () => {
    const json = {
      Response: {
        Data: {
          Id: 48,
          Desc: 'Seoul Zone 2 cooling anomaly\nInvestigating',
          Status: 'ABNORMAL',
          IsShow: true
        }
      }
    };
    const events = parseTencent(json);
    expect(events).toHaveLength(1);
    expect(events[0].provider).toBe('TENCENT');
    expect(events[0].title).toBe('Seoul Zone 2 cooling anomaly');
    expect(events[0].severity).toBe('major');
  });

  it('returns [] on empty response', () => {
    expect(parseTencent({})).toEqual([]);
  });
});
