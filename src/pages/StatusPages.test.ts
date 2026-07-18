import { mount, RouterLinkStub } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useStatusStore } from '@/stores/statusStore';
import type { ServiceStatus, StatusType } from '@/types/status';
import Dashboard from './Dashboard.vue';
import ProviderDetail from './ProviderDetail.vue';
import Providers from './Providers.vue';

const routeParams = { id: 'aws' };
const push = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams }),
  useRouter: () => ({ push })
}));

function service(
  provider: string,
  status: StatusType,
  serviceName: string,
  region = 'global'
): ServiceStatus {
  return {
    id: `${provider}-${serviceName}-${region}`,
    provider,
    serviceId: serviceName.toLowerCase().replaceAll(' ', '-'),
    serviceName,
    region,
    status,
    updatedAt: 1,
    sourceUrl: `https://status.example/${provider.toLowerCase()}`
  };
}

function setup(services: ServiceStatus[]) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useStatusStore();
  store.services = services;
  vi.spyOn(store, 'fetchStatus').mockResolvedValue();
  return { pinia, store };
}

const globalOptions = (pinia: ReturnType<typeof createPinia>) => ({
  plugins: [pinia, i18n],
  stubs: { RouterLink: RouterLinkStub }
});

describe('status pages', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    routeParams.id = 'aws';
    push.mockReset();
  });

  it('shows provider-level totals and lists only active incidents', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('AWS', 'operational', 'S3'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    const values = wrapper.findAll('.stat-card .stat-value').map(node => node.text());
    expect(values).toEqual(['1', '0', '1', '0']);

    // Operational rows (AWS) are excluded; only the GCP outage is listed.
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Google Cloud');
    expect(rows[0].text()).toContain('Compute Engine');
    expect(wrapper.findAll('tbody .status-badge')).toHaveLength(1);
    expect(wrapper.text()).not.toContain('Amazon Web Services');
  });

  it('shows an all-clear state when every provider is operational', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('GCP', 'operational', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.text()).toContain('All monitored services are operational');
  });

  it('describes the top summary cards in provider terms, not service terms', () => {
    // AWS reports two operational services but is a single provider; the
    // "Operational" card counts providers, so its description must say so too.
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('AWS', 'operational', 'S3'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    const descriptions = wrapper.findAll('.stat-card .stat-desc').map(node => node.text());
    expect(descriptions).toEqual([
      'Providers running normally',
      'Providers with performance issues',
      'Providers experiencing downtime',
      'Providers in planned maintenance'
    ]);
    expect(wrapper.text()).not.toContain('Services running normally');
    expect(wrapper.text()).not.toContain('Services experiencing downtime');
  });

  it('aggregates providers, sorts incidents first, and uses shared display data', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2', 'us-east-1'),
      service('AWS', 'operational', 'S3', 'us-west-2'),
      service('AWS', 'degraded', 'RDS', 'us-east-1'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    const cards = wrapper.findAll('.provider-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].get('.provider-name').text()).toBe('Google Cloud');
    expect(cards[0].get('.status-badge').text()).toBe('Outage');
    expect(cards[1].get('.provider-name').text()).toBe('Amazon Web Services');
    expect(cards[1].get('[data-testid="provider-total"]').text()).toBe('3');
    expect(cards[1].get('[data-testid="provider-regions"]').text()).toBe('2');
    expect(cards[1].get('[data-testid="provider-count-operational"]').text()).toBe('2');
    expect(cards[1].get('[data-testid="provider-count-degraded"]').text()).toBe('1');
    expect(cards[1].get('[data-testid="provider-count-outage"]').text()).toBe('0');
    expect(cards[1].get('[data-testid="provider-count-maintenance"]').text()).toBe('0');
    expect(
      cards[1].get('a[href="https://health.aws.amazon.com/health/status"]').attributes('href')
    ).toBe('https://health.aws.amazon.com/health/status');
    expect(cards[1].getComponent(RouterLinkStub).props('to')).toBe('/providers/aws');
  });

  it('shows a friendly provider heading and shared badges on provider detail', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('AWS', 'degraded', 'S3')
    ]);
    const wrapper = mount(ProviderDetail, { global: globalOptions(pinia) });

    expect(wrapper.get('h1').text()).toBe('Amazon Web Services');
    expect(wrapper.findAll('.status-badge')).toHaveLength(3);
    expect(wrapper.get('[data-testid="provider-overall-status"]').text()).toBe('Degraded');
    expect(wrapper.findAll('tbody .status-badge').map(badge => badge.text())).toEqual([
      'Operational',
      'Degraded'
    ]);
  });
});
