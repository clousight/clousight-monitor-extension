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
    const events = await parseRssFeed(rss, 'AWS', Date.parse('Wed, 02 Jul 2025 10:30:00 GMT'));
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.provider).toBe('AWS');
    expect(e.source_url).toBe('https://status.aws.amazon.com/#evt-1');
    expect(e.region).toBe('us-east-1');
    expect(e.severity).toBe('minor'); // "elevated errors" -> minor
    expect(e.external_id).toMatch(/^[0-9a-f]+$/);
    expect(e.started_at).not.toBeNull();
  });

  // AWS keeps only the latest state per incident. When resolved, the title is
  // prefixed "Service is operating normally: [RESOLVED] …" but the body is a
  // post-mortem that describes the past impact ("elevated error rates", "was
  // unavailable"). Severity must come from the resolved title, not the body,
  // otherwise a fixed incident keeps showing as an outage.
  it('classifies a [RESOLVED] AWS item as info despite fault words in the body', async () => {
    const resolved = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service is operating normally: [RESOLVED] Inaccurate Estimated Billing Data</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Customers saw elevated error rates and the console was unavailable. Degraded performance has been resolved.</description>
        <pubDate>Sat, 18 Jul 2026 06:57:41 GMT</pubDate>
      </item>
    </channel></rss>`;
    const events = await parseRssFeed(resolved, 'AWS');
    expect(events).toHaveLength(1);
    expect(events[0].severity).toBe('info');
    expect(events[0].resolved).toBe(true);
  });

  // AWS posts a fresh <item> for every update of one incident (all sharing the
  // same "#<service>_<timestamp>" guid prefix and the same homepage <link>), and
  // keeps the impact updates in the feed alongside the final [RESOLVED] one. They
  // must collapse to a single incident whose state is the LATEST update.
  it('collapses all updates of one AWS incident and reflects the latest resolved state', async () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service impact: Inaccurate Estimated Billing Data</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Customers saw elevated error rates; the console was unavailable.</description>
        <pubDate>Sat, 18 Jul 2026 01:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#billingconsole_100</guid>
      </item>
      <item>
        <title>Service impact: Inaccurate Estimated Billing Data</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Still investigating elevated error rates.</description>
        <pubDate>Sat, 18 Jul 2026 05:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#billingconsole_200</guid>
      </item>
      <item>
        <title>Service is operating normally: [RESOLVED] Inaccurate Estimated Billing Data</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Between ... elevated error rates ... has now been resolved.</description>
        <pubDate>Sat, 18 Jul 2026 14:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#billingconsole_300</guid>
      </item>
    </channel></rss>`;
    const events = await parseRssFeed(rss, 'AWS');
    expect(events).toHaveLength(1);
    expect(events[0].severity).toBe('info');
    expect(events[0].resolved).toBe(true);
    expect(events[0].title).toContain('[RESOLVED]');
    // started_at is the incident start (earliest update), not the resolution time.
    expect(events[0].started_at).toBe(new Date('Sat, 18 Jul 2026 01:00:00 GMT').toISOString());
    // the "official details" link points at the incident guid, not the bare homepage.
    expect(events[0].source_url).toContain('#billingconsole');
  });

  it('keeps different AWS services as separate incidents', async () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service impact: Inaccurate Estimated Billing Data</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Elevated error rates.</description>
        <pubDate>Sat, 18 Jul 2026 05:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#billingconsole_200</guid>
      </item>
      <item>
        <title>Service disruption: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Increased error rates in us-east-1.</description>
        <pubDate>Sat, 18 Jul 2026 05:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#ec2_200</guid>
      </item>
    </channel></rss>`;
    const events = await parseRssFeed(rss, 'AWS');
    expect(events).toHaveLength(2);
  });

  it('collapses ongoing updates but keeps the incident active until resolved', async () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service impact: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Investigating.</description>
        <pubDate>Sat, 18 Jul 2026 01:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#ec2_100</guid>
      </item>
      <item>
        <title>Service disruption: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Customers experiencing outage.</description>
        <pubDate>Sat, 18 Jul 2026 03:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#ec2_200</guid>
      </item>
    </channel></rss>`;
    // now = shortly after the latest update, so the incident is still active.
    const now = Date.parse('Sat, 18 Jul 2026 03:30:00 GMT');
    const events = await parseRssFeed(rss, 'AWS', now);
    expect(events).toHaveLength(1);
    expect(events[0].resolved).toBeFalsy();
    expect(events[0].severity).toBe('major');
  });

  // AWS guid service segments can include the region ("multipleservices-me-central-1"),
  // which must not defeat grouping of one incident's updates.
  it('groups updates whose guid service segment contains a region', async () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service impact: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Investigating.</description>
        <pubDate>Sat, 18 Jul 2026 01:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#multipleservices-me-central-1_100</guid>
      </item>
      <item>
        <title>Service disruption: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Outage.</description>
        <pubDate>Sat, 18 Jul 2026 03:00:00 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#multipleservices-me-central-1_200</guid>
      </item>
    </channel></rss>`;
    const now = Date.parse('Sat, 18 Jul 2026 03:30:00 GMT');
    const events = await parseRssFeed(rss, 'AWS', now);
    expect(events).toHaveLength(1);
  });

  // Ended incidents linger in all.rss for months without a [RESOLVED] item (their
  // resolution item has scrolled off), so a stale incident with no recent update
  // must be treated as resolved history, not an active outage.
  it('treats an incident with no recent update as resolved history', async () => {
    const rss = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service disruption: Increased Error Rates</title>
        <link>https://status.aws.amazon.com/</link>
        <description>Increased error rates in me-central-1.</description>
        <pubDate>Thu, 30 Apr 2026 00:25:54 GMT</pubDate>
        <guid isPermaLink="false">https://status.aws.amazon.com/#multipleservices-me-central-1_1777533954</guid>
      </item>
    </channel></rss>`;
    const now = Date.parse('Sat, 18 Jul 2026 00:00:00 GMT'); // ~2.5 months later
    const events = await parseRssFeed(rss, 'AWS', now);
    expect(events).toHaveLength(1);
    expect(events[0].resolved).toBe(true);
    expect(events[0].severity).toBe('info');
  });

  it('still classifies an active degradation title without resolved marker', async () => {
    const active = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>AWS</title>
      <item>
        <title>Service degradation: Increased error rates</title>
        <link>https://status.aws.amazon.com/#active-1</link>
        <description>We are investigating elevated error rates.</description>
        <pubDate>Sat, 18 Jul 2026 06:57:41 GMT</pubDate>
      </item>
    </channel></rss>`;
    const events = await parseRssFeed(active, 'AWS', Date.parse('Sat, 18 Jul 2026 07:30:00 GMT'));
    expect(events[0].severity).toBe('minor');
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
    const events = await parseRssFeed(atom, 'AZURE', Date.parse('2025-07-02T10:30:00Z'));
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
    expect(events.find(e => e.title === 'Networking degradation')?.resolved).toBe(false);
    expect(events.find(e => e.title === 'Resolved thing')?.resolved).toBe(true);
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
    expect(events.find(e => e.title === 'Past issue')?.resolved).toBe(true);
    expect(events.find(e => e.title === 'Ongoing issue')?.resolved).toBe(false);
    expect(events[0].title).toBe('Ongoing issue'); // sorted newest first
  });

  it('returns [] on non-array input', () => {
    expect(parseGcpIncidents({})).toEqual([]);
  });
});
