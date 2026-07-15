import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLlmConfig,
  saveLlmConfig,
  isLlmConfigured,
  generateBrief,
  DEFAULT_LLM_CONFIG
} from './llm';

// No `chrome` in jsdom → the service falls back to localStorage.
describe('llm config', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing is stored', async () => {
    const cfg = await getLlmConfig();
    expect(cfg).toEqual(DEFAULT_LLM_CONFIG);
  });

  it('round-trips config and trims/normalizes', async () => {
    await saveLlmConfig({ baseUrl: 'https://x.test/v1/', apiKey: '  k  ', model: 'm' });
    const cfg = await getLlmConfig();
    expect(cfg.baseUrl).toBe('https://x.test/v1'); // trailing slash stripped
    expect(cfg.apiKey).toBe('k'); // trimmed
    expect(cfg.model).toBe('m');
  });

  it('isLlmConfigured reflects presence of an API key', async () => {
    expect(await isLlmConfigured()).toBe(false);
    await saveLlmConfig({ ...DEFAULT_LLM_CONFIG, apiKey: 'abc' });
    expect(await isLlmConfigured()).toBe(true);
  });

  it('generateBrief throws when no key is configured', async () => {
    await expect(generateBrief({ provider: 'AWS', title: 'x' })).rejects.toThrow();
  });
});
