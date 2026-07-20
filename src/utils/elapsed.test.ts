import { describe, expect, it } from 'vitest';
import { formatElapsed } from './elapsed';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatElapsed', () => {
  it('reports minutes, hours and days ago in a locale-aware way', () => {
    const now = 1_000 * DAY;
    expect(formatElapsed(now - 5 * MIN, now, 'en')).toBe('5 minutes ago');
    expect(formatElapsed(now - 2 * HOUR, now, 'en')).toBe('2 hours ago');
    expect(formatElapsed(now - 3 * DAY, now, 'en')).toBe('3 days ago');
  });

  it('treats a just-started incident as at least one minute ago', () => {
    const now = 1_000 * DAY;
    expect(formatElapsed(now - 10_000, now, 'en')).toBe('1 minute ago');
  });
});
