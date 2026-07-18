import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ProviderLogo from './ProviderLogo.vue';

describe('ProviderLogo', () => {
  it('renders the bundled local logo with accessible alt text', () => {
    const wrapper = mount(ProviderLogo, {
      props: { code: 'AWS', name: 'Amazon Web Services' }
    });
    const img = wrapper.get('img');
    expect(img.attributes('src')).toBe('/images/providers/aws.svg');
    expect(img.attributes('alt')).toBe('Amazon Web Services');
  });

  it('falls back to the brand initial when no local logo exists', () => {
    const wrapper = mount(ProviderLogo, {
      props: { code: 'VOLCANO', name: 'Volcano Engine' }
    });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe('V');
  });

  it('falls back to the initial when the image fails to load', async () => {
    const wrapper = mount(ProviderLogo, {
      props: { code: 'AWS', name: 'Amazon Web Services' }
    });
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe('A');
  });
});
