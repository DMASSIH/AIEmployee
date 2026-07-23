import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import {
  S3StorageProvider,
  createEmbeddingProvider,
  type StorageProvider,
  type EmbeddingProvider,
} from '@aie/knowledge';
import {
  INGEST_QUEUE,
  MEMORY_QUEUE,
  type IngestJobData,
  type MemoryJobData,
} from '@aie/core';

declare module 'fastify' {
  interface FastifyInstance {
    /** Object storage for knowledge files (MinIO/S3). */
    storage: StorageProvider;
    /** Producer for the ingest pipeline consumed by apps/workers. */
    ingestQueue: Queue<IngestJobData>;
    /** Producer for background memory work (extract/summarize/embed/…). */
    memoryQueue: Queue<MemoryJobData>;
    /** Embeddings for retrieval-time query vectors (provider-agnostic). */
    embeddings: EmbeddingProvider;
  }
}

export interface KnowledgePluginOptions {
  redisUrl: string;
  s3: {
    endpoint: string;
    region: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
    forcePathStyle: boolean;
  };
  embeddingProvider: 'local' | 'openai';
  openaiApiKey?: string;
}

/**
 * Wires the knowledge infrastructure: object storage, the BullMQ ingest
 * producer, and the embedding provider. The queue gets its own Redis connection
 * (BullMQ requires maxRetriesPerRequest: null, unlike the session client).
 */
export const knowledgePlugin = fp<KnowledgePluginOptions>(
  async (app, opts) => {
    const storage = new S3StorageProvider(opts.s3);
    await storage.ensureReady();

    const connection = new Redis(opts.redisUrl, { maxRetriesPerRequest: null });
    const ingestQueue = new Queue<IngestJobData>(INGEST_QUEUE, { connection });
    const memoryQueue = new Queue<MemoryJobData>(MEMORY_QUEUE, { connection });

    const embeddings = createEmbeddingProvider({
      provider: opts.embeddingProvider,
      openaiApiKey: opts.openaiApiKey,
    });

    app.decorate('storage', storage);
    app.decorate('ingestQueue', ingestQueue);
    app.decorate('memoryQueue', memoryQueue);
    app.decorate('embeddings', embeddings);

    app.addHook('onClose', async () => {
      await ingestQueue.close();
      await memoryQueue.close();
      await connection.quit();
    });
  },
  { name: 'knowledge', dependencies: ['redis'] },
);
