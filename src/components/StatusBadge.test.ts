import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { describe, expect, it } from 'vitest';
import { cspMessageCompiler } from '@/i18n/messageCompiler';
import type { StatusType } from '@/types/status';
import StatusBadge from './StatusBadge.vue';

const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  messageCompiler: cspMessageCompiler,
  messages: {
    'zh-CN': {
      status: {
        short: {
          operational: '正常',
          degraded: '服务降级',
          outage: '故障',
          maintenance: '维护中',
          unknown: '未知'
        }
      }
    }
  }
});

describe('StatusBadge', () => {
  it.each([
    ['operational', '正常'],
    ['degraded', '服务降级'],
    ['outage', '故障'],
    ['maintenance', '维护中'],
    ['unknown', '未知']
  ] as const)('renders %s with text and an accessible status', (status, label) => {
    const wrapper = mount(StatusBadge, {
      props: { status: status as StatusType | 'unknown' },
      global: { plugins: [i18n] }
    });
    expect(wrapper.text()).toBe(label);
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.attributes('aria-label')).toBe(label);
    expect(wrapper.classes()).toContain(`status-${status}`);
  });

  it('prefers an explicit label', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'operational', label: '运行良好' },
      global: { plugins: [i18n] }
    });
    expect(wrapper.text()).toBe('运行良好');
    expect(wrapper.attributes('aria-label')).toBe('运行良好');
  });
});
