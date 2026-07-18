/**
 * Static, locally-bundled catalog of regions and services for the providers
 * whose public status feed carries structured region/service data, so the
 * subscription rule editor can offer cascading dropdowns instead of free text.
 *
 * Only AWS and Alibaba Cloud qualify today:
 * - AWS: the RSS parser extracts an `xx-yyy-N` region code from the incident
 *   title (see `parsers/rss.ts`), so these exact codes match.
 * - Alibaba: the status API exposes `region`/`regionId` and `productName`
 *   (see `parsers/alibaba.ts`). Matching is fuzzy substring, so short service
 *   abbreviations are used; Alibaba matching is best-effort.
 *
 * Other providers emit incident-level events with no region/service, so they
 * intentionally have no catalog and keep provider + severity matching.
 */

export interface ProviderCatalog {
  regions: string[];
  services: string[];
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-south-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ca-central-1',
  'eu-central-1',
  'eu-central-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'eu-south-1',
  'eu-south-2',
  'me-south-1',
  'me-central-1',
  'sa-east-1'
];

const ALIBABA_REGIONS = [
  'cn-hangzhou',
  'cn-shanghai',
  'cn-qingdao',
  'cn-beijing',
  'cn-zhangjiakou',
  'cn-huhehaote',
  'cn-wulanchabu',
  'cn-shenzhen',
  'cn-heyuan',
  'cn-chengdu',
  'cn-hongkong',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-5',
  'ap-southeast-6',
  'ap-southeast-7',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'us-west-1',
  'us-east-1',
  'eu-central-1',
  'eu-west-1',
  'me-east-1'
];

// Short product abbreviations that substring-match Alibaba's `productName`.
const ALIBABA_SERVICES = [
  'ECS',
  'OSS',
  'RDS',
  'PolarDB',
  'Redis',
  'MongoDB',
  'SLB',
  'CLB',
  'VPC',
  'EIP',
  'NAT',
  'CDN',
  'DNS',
  'ACK',
  'MaxCompute',
  'DataWorks',
  'Elasticsearch',
  'Function Compute',
  'Message Queue',
  'Log Service',
  'WAF',
  'CloudMonitor'
];

const CATALOG: Record<string, ProviderCatalog> = {
  AWS: { regions: AWS_REGIONS, services: [] },
  ALIBABA: { regions: ALIBABA_REGIONS, services: ALIBABA_SERVICES }
};

/** Provider codes that support cascading region/service selection. */
export const CASCADE_PROVIDER_CODES: readonly string[] = Object.keys(CATALOG);

export function getProviderCatalog(code: string): ProviderCatalog | null {
  return CATALOG[code.trim().toUpperCase()] ?? null;
}

/** True when the selection is non-empty and every provider has a catalog. */
export function supportsCascade(codes: string[]): boolean {
  return codes.length > 0 && codes.every(code => getProviderCatalog(code) !== null);
}

function unionSorted(codes: string[], pick: (c: ProviderCatalog) => string[]): string[] {
  const set = new Set<string>();
  for (const code of codes) {
    const catalog = getProviderCatalog(code);
    if (catalog) {
      for (const value of pick(catalog)) set.add(value);
    }
  }
  return [...set].sort();
}

export function getRegionOptions(codes: string[]): string[] {
  return unionSorted(codes, c => c.regions);
}

export function getServiceOptions(codes: string[]): string[] {
  return unionSorted(codes, c => c.services);
}
