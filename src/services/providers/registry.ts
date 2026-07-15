/**
 * Declarative provider registry. Adding a provider means adding one entry here
 * (plus its origin to manifest host permissions and its name to i18n).
 * See CONTRIBUTING.md → "Adding a provider".
 */

import type { ProviderDef } from './types';

export const PROVIDERS: ProviderDef[] = [
  {
    code: 'AWS',
    name: 'Amazon Web Services',
    parser: 'rss',
    feedUrl: 'https://status.aws.amazon.com/rss/all.rss',
    statusPageUrl: 'https://health.aws.amazon.com/health/status',
    origin: 'https://status.aws.amazon.com/*'
  },
  {
    code: 'AZURE',
    name: 'Microsoft Azure',
    parser: 'rss',
    feedUrl: 'https://azure.status.microsoft/status/feed/',
    statusPageUrl: 'https://azure.status.microsoft/status/',
    origin: 'https://azure.status.microsoft/*'
  },
  {
    code: 'GCP',
    name: 'Google Cloud',
    parser: 'gcp',
    feedUrl: 'https://status.cloud.google.com/incidents.json',
    statusPageUrl: 'https://status.cloud.google.com/',
    origin: 'https://status.cloud.google.com/*'
  },
  // Alibaba & Tencent: bespoke JSON adapters for their undocumented status APIs
  // (their status sites are SPAs with no generic RSS/Statuspage feed). Verified
  // callable without auth; when quiet they correctly report operational.
  {
    code: 'ALIBABA',
    name: 'Alibaba Cloud',
    parser: 'alibaba',
    feedUrl: 'https://status.alibabacloud.com/api/status/listEventInProgressInternational',
    statusPageUrl: 'https://status.alibabacloud.com/',
    origin: 'https://status.alibabacloud.com/*'
  },
  {
    code: 'TENCENT',
    name: 'Tencent Cloud',
    parser: 'tencent',
    feedUrl: 'https://status.tencentcloud.com/v1/api/status/DescribeHappening?BelongSite=1',
    statusPageUrl: 'https://status.tencentcloud.com/',
    origin: 'https://status.tencentcloud.com/*'
  },

  // --- Experimental: no verified machine-readable feed yet. -------------------
  // Volcano's status data appears to come from a third-party CDN blob and Huawei's
  // status host is unreachable outside its home region, so neither has a confirmed
  // endpoint. They land in the summary's `errors` array until one is found.
  // Finding a real endpoint is an ideal contribution — see CONTRIBUTING.md.
  {
    code: 'HUAWEI',
    name: 'Huawei Cloud',
    parser: 'statuspage',
    feedUrl: 'https://status.huaweicloud.com/api/v2/incidents.json',
    statusPageUrl: 'https://status.huaweicloud.com/',
    origin: 'https://status.huaweicloud.com/*',
    experimental: true
  },
  {
    code: 'VOLCANO',
    name: 'Volcano Engine',
    parser: 'statuspage',
    feedUrl: 'https://status.volcengine.com/api/v2/incidents.json',
    statusPageUrl: 'https://status.volcengine.com/',
    origin: 'https://status.volcengine.com/*',
    experimental: true
  }
];

export const PROVIDER_CODES = PROVIDERS.map(p => p.code);

/** Providers with a verified, working machine-readable feed. */
export const VERIFIED_PROVIDERS = PROVIDERS.filter(p => !p.experimental);

export function getProvider(code: string): ProviderDef | undefined {
  return PROVIDERS.find(p => p.code === code.toUpperCase());
}
