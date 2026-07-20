import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '@/i18n';
import { useStatusStore } from '@/stores/statusStore';
import { useUserStore } from '@/stores/userStore';
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

// Provider subscription toggling touches host permissions; stub them out so the
// tests exercise the UI wiring without a real chrome.permissions surface.
vi.mock('@/services/permissions', () => ({
  requestProviderOrigin: vi.fn().mockResolvedValue(true),
  removeProviderOrigin: vi.fn()
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

  it('lists resolved incidents as recent history, separate from the active table', () => {
    const { pinia } = setup([
      {
        ...service('AWS', 'operational', 'Billing'),
        resolved: true,
        statusMessage: 'Inaccurate Estimated Billing Data',
        updatedAt: 100
      },
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    const history = wrapper.get('[data-testid="resolved-history"]');
    expect(history.text()).toContain('Inaccurate Estimated Billing Data');
    expect(history.text()).toContain('Amazon Web Services');
    // The resolved row must not appear in the active incidents table.
    const activeRows = wrapper.get('[data-testid="active-incidents"]').findAll('tbody tr');
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].text()).toContain('Compute Engine');
    expect(activeRows[0].text()).not.toContain('Inaccurate Estimated Billing Data');
  });

  it('shows resolved history even when everything is currently operational', () => {
    const { pinia } = setup([
      { ...service('AWS', 'operational', 'Billing'), resolved: true, updatedAt: 100 },
      service('GCP', 'operational', 'Compute Engine')
    ]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    expect(wrapper.text()).toContain('All monitored services are operational');
    expect(wrapper.find('[data-testid="resolved-history"]').exists()).toBe(true);
  });

  it('omits the resolved history section when there is none', () => {
    const { pinia } = setup([service('GCP', 'outage', 'Compute Engine')]);
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    expect(wrapper.find('[data-testid="resolved-history"]').exists()).toBe(false);
  });

  it('dashboard only counts and lists watched providers', () => {
    const { pinia } = setup([
      service('AWS', 'outage', 'Compute'),
      service('GCP', 'operational', 'Compute Engine')
    ]);
    const user = useUserStore();
    user.settings.providers = ['GCP']; // AWS unwatched
    const wrapper = mount(Dashboard, { global: globalOptions(pinia) });

    // Summary counts only the watched provider (GCP, operational).
    const values = wrapper.findAll('.stat-card .stat-value').map(n => n.text());
    expect(values).toEqual(['1', '0', '0', '0']);
    // The unwatched AWS outage must not appear anywhere on the dashboard.
    expect(wrapper.text()).not.toContain('Amazon Web Services');
    expect(wrapper.text()).not.toContain('Compute'); // AWS incident title
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
    // GCP has one active event (the outage).
    expect(cards[0].get('[data-testid="provider-active"]').text()).toContain('1');
    expect(cards[1].get('.provider-name').text()).toBe('Amazon Web Services');
    // AWS: two operational + one degraded => exactly one active event, not "3 rows".
    expect(cards[1].get('[data-testid="provider-active"]').text()).toContain('1');
    expect(cards[1].find('[data-testid="provider-total"]').exists()).toBe(false);
    expect(
      cards[1].get('a[href="https://health.aws.amazon.com/health/status"]').attributes('href')
    ).toBe('https://health.aws.amazon.com/health/status');
    expect(cards[1].getComponent(RouterLinkStub).props('to')).toBe('/providers/aws');
  });

  it('shows "Operational" for a provider with no active events', () => {
    const { pinia } = setup([service('AWS', 'operational', 'EC2')]);
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    const card = wrapper.get('.provider-card');
    expect(card.find('[data-testid="provider-active"]').exists()).toBe(false);
    expect(card.get('[data-testid="provider-ok"]').text()).toBe('Operational');
  });

  it('only shows cards for watched providers, even if stale data lingers', () => {
    const { pinia } = setup([
      service('AWS', 'operational', 'EC2'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const user = useUserStore();
    // AWS was unwatched but its data still lingers in the store; its card must go.
    user.settings.providers = ['GCP'];
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    const names = wrapper.findAll('.provider-card .provider-name').map(n => n.text());
    expect(names).toEqual(['Google Cloud']);
    // AWS is gone from the cards but shows up as a quick-add chip instead.
    expect(wrapper.get('.unwatched-bar').text()).toContain('Amazon Web Services');
  });

  it('offers providers you are not watching as quick-add chips', () => {
    const { pinia } = setup([service('AWS', 'operational', 'EC2')]);
    const user = useUserStore();
    user.settings.providers = ['AWS'];
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    const chips = wrapper.findAll('[data-testid="watch-chip"]');
    expect(chips.length).toBeGreaterThan(0);
    expect(wrapper.get('.unwatched-bar').text()).toContain('Microsoft Azure');
  });

  it('unwatches a provider from its card and stops monitoring it', async () => {
    const { pinia, store } = setup([
      service('AWS', 'operational', 'EC2'),
      service('GCP', 'outage', 'Compute Engine')
    ]);
    const user = useUserStore();
    user.settings.providers = ['AWS', 'GCP'];
    vi.spyOn(store, 'refreshStatus').mockResolvedValue();
    const wrapper = mount(Providers, { global: globalOptions(pinia) });

    // GCP (outage) sorts first; unwatch it from its card.
    await wrapper.findAll('.provider-card')[0].get('[data-testid="unwatch-btn"]').trigger('click');
    await flushPromises();

    expect(user.settings.providers).toEqual(['AWS']);
    expect(store.refreshStatus).toHaveBeenCalled();
  });

  it('shows each provider its own last-checked time, falling back to the global time', () => {
    const { pinia, store } = setup([
      service('AWS', 'operational', 'EC2'),
      service('GCP', 'operational', 'Compute Engine')
    ]);
    const awsChecked = Date.UTC(2026, 6, 18, 12, 0);
    store.lastUpdated = Date.UTC(2026, 6, 19, 6, 0);
    store.providerCheckedAt = { AWS: awsChecked };
    const fmt = (ms: number) =>
      new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(ms)
      );

    const wrapper = mount(Providers, { global: globalOptions(pinia) });
    const byName = (name: string) =>
      wrapper.findAll('.provider-card').find(c => c.get('.provider-name').text() === name)!;

    // AWS has its own timestamp; GCP has none and falls back to the global one.
    expect(byName('Amazon Web Services').get('[data-testid="card-checked"]').text()).toContain(
      fmt(awsChecked)
    );
    expect(byName('Google Cloud').get('[data-testid="card-checked"]').text()).toContain(
      fmt(store.lastUpdated)
    );
  });

  it('shows a resolved-incident history on the provider detail page', () => {
    routeParams.id = 'aws';
    const { pinia } = setup([
      {
        ...service('AWS', 'operational', 'EC2'),
        resolved: true,
        statusMessage: 'Elevated error rates (resolved)',
        updatedAt: 100
      },
      service('AWS', 'operational', 'S3')
    ]);
    const wrapper = mount(ProviderDetail, { global: globalOptions(pinia) });

    const history = wrapper.get('[data-testid="resolved-history"]');
    expect(history.text()).toContain('Elevated error rates (resolved)');
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
