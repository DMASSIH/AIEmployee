import type { AIProvider } from './types.js';
import { EchoProvider } from './echo.js';
import { OpenAIProvider } from './openai.js';

export * from './types.js';
export { EchoProvider } from './echo.js';
export { OpenAIProvider } from './openai.js';

export interface AIProviderConfig {
  provider: 'echo' | 'openai';
  openaiApiKey?: string;
  chatModel?: string;
  baseUrl?: string;
}

/**
 * The single place providers are selected. Callers pass config (from validated
 * env) and receive the interface — never a concrete class. Adding a provider
 * means adding a case here and a new file under `provider/`; nothing else.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.provider === 'openai') {
    if (!config.openaiApiKey) throw new Error('AI_PROVIDER=openai requires OPENAI_API_KEY');
    return new OpenAIProvider(config.openaiApiKey, config.chatModel ?? 'gpt-4o-mini', config.baseUrl);
  }
  return new EchoProvider();
}
