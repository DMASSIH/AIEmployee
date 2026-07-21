import fp from 'fastify-plugin';
import {
  createAIProvider,
  defaultToolRegistry,
  type AIProvider,
  type ToolRegistry,
} from '@aie/ai';

declare module 'fastify' {
  interface FastifyInstance {
    /** Provider-agnostic chat model (echo in dev/CI, OpenAI when configured). */
    aiProvider: AIProvider;
    /** Tool-calling registry — empty in M10 (framework only). */
    toolRegistry: ToolRegistry;
  }
}

export interface AIPluginOptions {
  provider: 'echo' | 'openai';
  openaiApiKey?: string;
  chatModel: string;
  baseUrl?: string;
}

/** Selects the AI provider once at boot and exposes it to the runtime routes. */
export const aiPlugin = fp<AIPluginOptions>(
  (app, opts) => {
    app.decorate(
      'aiProvider',
      createAIProvider({
        provider: opts.provider,
        openaiApiKey: opts.openaiApiKey,
        chatModel: opts.chatModel,
        baseUrl: opts.baseUrl,
      }),
    );
    app.decorate('toolRegistry', defaultToolRegistry);
  },
  { name: 'ai' },
);
