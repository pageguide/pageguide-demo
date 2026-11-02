import type { Provider } from './types';

// Provider config. Both are OpenAI-compatible chat-completions endpoints, so one
// request builder serves both. Model slugs are overridable from Settings.
export const PROVIDERS: Record<
  Provider,
  { label: string; endpoint: string; defaultModel: string; envKey: string }
> = {
  openai: {
    label: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
  },
  openrouter: {
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'google/gemini-3-flash-preview',
    envKey: 'OPENROUTER_API_KEY',
  },
};

// Server-side key resolution: operator env key wins, else the per-request key the
// visitor saved in their browser and sent in the x-provider-key header.
export function resolveKey(provider: Provider, headerKey: string | null): string {
  const env = process.env[PROVIDERS[provider].envKey];
  return (env && env.trim()) || (headerKey && headerKey.trim()) || '';
}

export function prettyModel(model: string): string {
  // "google/gemini-3-flash-preview" -> "gemini-3-flash-preview" for display
  const i = model.indexOf('/');
  return i >= 0 ? model.slice(i + 1) : model;
}
