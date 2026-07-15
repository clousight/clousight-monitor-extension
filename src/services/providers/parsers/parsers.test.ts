import { describe, it, expect } from 'vitest';
import { parseRssFeed } from './rss';
import { parseStatuspage } from './statuspage';
import { parseGcpIncidents } from './gcp';

describe('parseRssFeed (RSS 2.0)', () => {
  const rss = `<?xml version="1.0"?>
  <rss version="2.0"><channel>
    <title>AWS</title>
    <item>
      <title>Increased error rates in us-east-1</title>
      <link>https://status.aws.amazon.com/#evt-1</link>
      <description>We are investigating elevated errors.</description>
      <pubDate>Wed, 02 Jul 2025 10:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;

  it('extracts an event with region and inferred severity', async () => {
    const events = await parseRssFeed(rss, 'AWS');
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.provider).toBe('AWS');
    expect(e.source_url).toBe('https://status.aws.amazon.com/#evt-1');
    expect(e.region).toBe('us-east-1');
    expect(e.severity).toBe('minor'); // "elevated errors" -> minor
    expect(e.external_id).toMatch(/^[0-9a-f]+$/);
    expect(e.started_at).not.toBeNull();
  });
});

describe('parseRssFeed (Atom)', () => {
  const atom = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <entry>
      <title>Service outage</title>
      <link href="https://azure.status.microsoft/incident/42"/>
      <summary>A service is unavailable.</summary>
      <updated>2025-07-02T10:00:00Z</updated>
    </entry>
  </feed>`;

  it('reads href links and maps outage to major', async () => {
    const events = await parseRssFeed(atom, 'AZURE');
    expect(events).toHaveLength(1);
    expect(events[0].source_url).toBe('https://azure.status.microsoft/incident/42');
    expect(events[0].severity).toBe('major');
  });
});

describe('parseStatuspage', () => {
  it('maps impact to severity and marks resolved as info', () => {
    const json = {
      incidents: [
        {
          id: 'abc',
          name: 'Networking degradation',
          status: 'monitoring',
          impact: 'major',
          created_at: '2025-07-02T10:00:00Z',
          resolved_at: null,
          incident_updates: [{ body: 'Investigating', created_at: '2025-07-02T10:05:00Z' }]
        },
        {
          id: 'def',
          name: 'Resolved thing',
          status: 'resolved',
          impact: 'critical',
          created_at: '2025-07-01T10:00:00Z',
          resolved_at: '2025-07-01T12:00:00Z'
        }
      ]
    };
    const events = parseStatuspage(json, 'ALIBABA');
    expect(events).toHaveLength(2);
    expect(events.find(e => e.title === 'Networking degradation')?.severity).toBe('major');
    expect(events.find(e => e.title === 'Resolved thing')?.severity).toBe('info');
  });

  it('returns [] on non-statuspage payloads', () => {
    expect(parseStatuspage({}, 'TENCENT')).toEqual([]);
    expect(parseStatuspage('<html></html>', 'TENCENT')).toEqual([]);
  });
});

describe('parseGcpIncidents', () => {
  it('parses incidents and marks ended ones as info', () => {
    const json = [
      {
        id: '1',
        external_desc: 'Ongoing issue',
        begin: '2025-07-02T10:00:00Z',
        updates: [{ text: 'looking' }]
      },
      {
        id: '2',
        external_desc: 'Past issue',
        begin: '2025-07-01T10:00:00Z',
        end: '2025-07-01T11:00:00Z'
      }
    ];
    const events = parseGcpIncidents(json);
    expect(events).toHaveLength(2);
    expect(events.find(e => e.title === 'Past issue')?.severity).toBe('info');
    expect(events[0].title).toBe('Ongoing issue'); // sorted newest first
  });

  it('returns [] on non-array input', () => {
    expect(parseGcpIncidents({})).toEqual([]);
  });
});
