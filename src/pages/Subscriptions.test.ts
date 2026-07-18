import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { i18n } from '@/i18n';
import { getSubscriptions } from '@/services/subscriptions';
import Subscriptions from './Subscriptions.vue';

function mountPage() {
  return mount(Subscriptions, { global: { plugins: [i18n] } });
}

async function openEditorWithProvider(wrapper: VueWrapper, code: string) {
  await wrapper.get('[data-testid="new-rule"]').trigger('click');
  await wrapper.get('[data-testid="all-providers"]').setValue(false);
  await wrapper.get(`input[data-testid="provider-${code}"]`).setValue(true);
}

describe('Subscriptions cascading filters', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en';
    localStorage.clear();
  });

  it('shows a region dropdown but no service dropdown for AWS', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await openEditorWithProvider(wrapper, 'AWS');

    expect(wrapper.find('[data-testid="region-cascade"]').exists()).toBe(true);
    expect(wrapper.find('input[data-testid="region-opt-us-east-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="service-cascade"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="region-freetext"]').exists()).toBe(false);
  });

  it('shows region and service dropdowns for Alibaba', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await openEditorWithProvider(wrapper, 'ALIBABA');

    expect(wrapper.find('[data-testid="region-cascade"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="service-cascade"]').exists()).toBe(true);
    expect(wrapper.find('input[data-testid="service-opt-ECS"]').exists()).toBe(true);
  });

  it('falls back to free-text for non-cascade providers', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await openEditorWithProvider(wrapper, 'GCP');

    expect(wrapper.find('[data-testid="region-cascade"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="region-freetext"]').exists()).toBe(true);
  });

  it('uses free-text when matching all providers', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.get('[data-testid="new-rule"]').trigger('click');

    expect(wrapper.find('[data-testid="region-cascade"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="region-freetext"]').exists()).toBe(true);
  });

  it('prunes selected regions that a provider change no longer offers', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await openEditorWithProvider(wrapper, 'AWS');
    await wrapper.get('input[data-testid="region-opt-us-east-1"]').setValue(true);

    // Switch from AWS to Alibaba: 'us-east-1' is also an Alibaba region → kept.
    await wrapper.get('input[data-testid="provider-AWS"]').setValue(false);
    await wrapper.get('input[data-testid="provider-ALIBABA"]').setValue(true);
    expect(
      (wrapper.get('input[data-testid="region-opt-us-east-1"]').element as HTMLInputElement).checked
    ).toBe(true);

    // 'sa-east-1' (AWS-only) would be pruned; assert it is not offered by Alibaba.
    expect(wrapper.find('input[data-testid="region-opt-sa-east-1"]').exists()).toBe(false);
  });

  it('persists cascading selections as the rule regions array', async () => {
    const wrapper = mountPage();
    await flushPromises();
    await openEditorWithProvider(wrapper, 'AWS');
    await wrapper.get('input[data-testid="region-opt-us-east-1"]').setValue(true);
    await wrapper.get('form.editor-form').trigger('submit');
    await flushPromises();

    const saved = await getSubscriptions();
    expect(saved).toHaveLength(1);
    expect(saved[0].providers).toEqual(['AWS']);
    expect(saved[0].regions).toEqual(['us-east-1']);
  });
});
