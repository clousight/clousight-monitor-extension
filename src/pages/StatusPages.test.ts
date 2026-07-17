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

  it('shows provider-level dashboard totals and friendly provider names', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('AWS', 'operational', 'S3'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    const values = wrapper.findAll('.stat-card .stat-value').map(node => node.text());
    expect(values).toEqual(['1', '0', '1', '0']);
    expect(wrapper.text()).toContain('Amazon Web Services');
    expect(wrapper.text()).toContain('Google Cloud');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(3);
  });

  it('aggregates providers, sorts incidents first, and uses shared display data', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2', 'us-east-1'),
      service('AWS', 'operational', 'S3', 'us-west-2'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    const cards = wrapper.findAll('.provider-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].get('.provider-name').text()).toBe('Google Cloud');
    expect(cards[0].get('[role="status"]').text()).toBe('Outage');
    expect(cards[1].get('.provider-name').text()).toBe('Amazon Web Services');
    expect(cards[1].text()).toContain('2');
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
    expect(wrapper.findAll('[role="status"]')).toHaveLength(3);
    expect(wrapper.text()).toContain('Degraded');
  });
});
