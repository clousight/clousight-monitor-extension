import { getProvider } from '@/services/providers/registry';

/**
 * Registry codes (lowercased) that ship a bundled square logo under
 * `public/images/providers/`. Providers not listed here fall back to the
 * brand-initial avatar in `ProviderLogo`. Add a slug here when its asset lands.
 */
const PROVIDER_LOGO_SLUGS = new Set([
  'aws',
  'azure',
  'gcp',
  'alibaba',
  'tencent',
  'cloudflare',
  'digitalocean',
  'linode',
  'huawei'
]);

export function getProviderDisplayName(code: string): string {
  return getProvider(code)?.name ?? code;
}

export function getProviderLogoUrl(code: string): string | null {
  const slug = code.trim().toLowerCase();
  return PROVIDER_LOGO_SLUGS.has(slug) ? `/images/providers/${slug}.svg` : null;
}

export function getProviderId(code: string): string {
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
