import type { EmbeddingProvider } from './provider.js';
import { LocalEmbeddingProvider } from './local.js';
import { OpenAIEmbeddingProvider } from './openai.js';

export type { EmbeddingProvider } from './provider.js';
export { embedInBatches } from './provider.js';
export { LocalEmbeddingProvider } from './local.js';
export { OpenAIEmbeddingProvider } from './openai.js';

export interface EmbeddingConfig {
  provider: 'local' | 'openai';
  openaiApiKey?: string;
}

/**
 * The single place providers are selected. Callers pass config (usually from
 * validated env) and receive the interface — never a concrete class.
 */
export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProvider {
  if (config.provider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('EMBEDDING_PROVIDER=openai requires OPENAI_API_KEY');
    }
    return new OpenAIEmbeddingProvider(config.openaiApiKey);
  }
  return new LocalEmbeddingProvider();
}
