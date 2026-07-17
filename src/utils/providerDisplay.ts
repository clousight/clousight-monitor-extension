import { getProvider } from '@/services/providers/registry';

export function getProviderDisplayName(code: string): string {
  return getProvider(code)?.name ?? code;
}

export function getProviderId(code: string): string {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
