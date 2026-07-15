import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSubscriptions,
  addSubscription,
  updateSubscription,
  deleteSubscription,
  SUBSCRIPTION_RULE_MAX
} from './subscriptions';

const base = {
  name: 'rule',
  providers: ['AWS'],
  regions: [],
  services: [],
  minSeverity: 'major' as const,
  browser: true
};

describe('subscriptions (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear());

  it('starts empty', async () => {
    expect(await getSubscriptions()).toEqual([]);
  });

  it('adds, updates, and deletes', async () => {
    const created = await addSubscription(base);
    expect(created.id).toBeTruthy();
    expect(await getSubscriptions()).toHaveLength(1);

    await updateSubscription(created.id, { name: 'renamed', providers: ['GCP'] });
    const list = await getSubscriptions();
    expect(list[0].name).toBe('renamed');
    expect(list[0].providers).toEqual(['GCP']);

    await deleteSubscription(created.id);
    expect(await getSubscriptions()).toEqual([]);
  });

  it('enforces the rule limit', async () => {
    for (let i = 0; i < SUBSCRIPTION_RULE_MAX; i++) {
      await addSubscription({ ...base, name: `r${i}` });
    }
    await expect(addSubscription(base)).rejects.toThrow();
    expect(await getSubscriptions()).toHaveLength(SUBSCRIPTION_RULE_MAX);
  });
});
