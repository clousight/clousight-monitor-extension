/**
 * Bring-your-own-key LLM incident briefings (optional).
 *
 * Calls an OpenAI-compatible /chat/completions endpoint directly from the
 * extension using a key the user provides. The key is stored locally
 * (chrome.storage.local) and never synced or sent anywhere but the endpoint
 * the user configured.
 */

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = 'llmConfig';

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini'
};

function hasLocal(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

export async function getLlmConfig(): Promise<LlmConfig> {
  let stored: Partial<LlmConfig> | undefined;
  if (hasLocal()) {
    stored = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as
      Partial<LlmConfig> | undefined;
  } else {
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<LlmConfig>;
    } catch {
      stored = undefined;
    }
  }
  return { ...DEFAULT_LLM_CONFIG, ...(stored || {}) };
}

export async function saveLlmConfig(config: LlmConfig): Promise<void> {
  const clean: LlmConfig = {
    baseUrl: config.baseUrl.trim().replace(/\/$/, '') || DEFAULT_LLM_CONFIG.baseUrl,
    apiKey: config.apiKey.trim(),
    model: config.model.trim() || DEFAULT_LLM_CONFIG.model
  };
  if (hasLocal()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: clean });
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  }
}

export async function isLlmConfigured(): Promise<boolean> {
  const c = await getLlmConfig();
  return Boolean(c.apiKey && c.baseUrl && c.model);
}

export interface BriefInput {
  provider: string;
  title: string;
  body?: string | null;
  severity?: string;
  region?: string | null;
  sourceUrl?: string | null;
}

const SYSTEM_PROMPT =
  'You are a cloud operations briefing assistant. Reply in the same language as the ' +
  'input. Produce a short, structured brief: 1) one-sentence summary 2) likely impact ' +
  '3) suggested action to watch. Keep it under ~120 words and never invent facts that ' +
  'were not provided.';

export async function generateBrief(input: BriefInput): Promise<string> {
  const cfg = await getLlmConfig();
  if (!cfg.apiKey) {
    throw new Error('LLM not configured');
  }

  const userBlock = [
    `Provider: ${input.provider || 'unknown'}`,
    input.severity ? `Severity: ${input.severity}` : '',
    input.region ? `Region: ${input.region}` : '',
    `Title: ${input.title}`,
    input.body ? `Details: ${input.body}` : '',
    input.sourceUrl ? `Link: ${input.sourceUrl}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userBlock }
      ]
    }),
    signal: AbortSignal.timeout(30_000)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('Empty LLM response');
  }
  return content;
}
