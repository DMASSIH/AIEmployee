/**
 * Worker entrypoint. One image, many worker types (WORKER_TYPE selects which
 * queues this process consumes). Milestone 9 wires the first real consumer: the
 * knowledge `ingest` pipeline (extract → chunk → embed → persist).
 */
import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { createDb } from '@aie/db';
import { S3StorageProvider, createEmbeddingProvider } from '@aie/knowledge';
import { createAIProvider } from '@aie/ai';
import { MemoryEngine } from '@aie/memory';
import { INGEST_QUEUE, MEMORY_QUEUE, type IngestJobData, type MemoryJobData } from '@aie/core';
import { loadEnv } from './config/env.js';
import { runIngest } from './ingest/processor.js';
import { runMemory, type MemoryResult } from './memory/processor.js';

async function main(): Promise<void> {
  const env = loadEnv();

  const db = createDb(env.DATABASE_URL);
  const storage = new S3StorageProvider({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
  const embeddings = createEmbeddingProvider({
    provider: env.EMBEDDING_PROVIDER,
    openaiApiKey: env.OPENAI_API_KEY,
  });
  // BullMQ requires maxRetriesPerRequest: null on its connection.
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const workers: Worker[] = [];
  const wantIngest = env.WORKER_TYPE === 'all' || env.WORKER_TYPE === 'ingest';
  const wantMemory = env.WORKER_TYPE === 'all' || env.WORKER_TYPE === 'memory';

  if (wantIngest) {
    await storage.ensureReady();
    const worker = new Worker<IngestJobData>(
      INGEST_QUEUE,
      (job: Job<IngestJobData>) => runIngest(job.data, { db, storage, embeddings }),
      { connection, concurrency: env.INGEST_CONCURRENCY },
    );
    worker.on('completed', (job, result: { chunkCount: number }) =>
      console.warn(`[ingest] ${job.data.sourceId} → ready (${result.chunkCount} chunks)`),
    );
    worker.on('failed', (job, err) =>
      console.error(`[ingest] ${job?.data.sourceId ?? '?'} failed: ${err.message}`),
    );
    workers.push(worker);
    console.warn(`[workers] ingest worker listening (concurrency=${env.INGEST_CONCURRENCY})`);
  }

  if (wantMemory) {
    // The AI provider is injected into the engine as the narrow MemoryChatProvider
    // (structural) — @aie/memory never imports @aie/ai, keeping the graph acyclic.
    const provider = createAIProvider({
      provider: env.AI_PROVIDER,
      openaiApiKey: env.OPENAI_API_KEY,
      chatModel: env.AI_CHAT_MODEL,
      baseUrl: env.AI_BASE_URL,
    });
    const engine = new MemoryEngine({ db, embeddings, provider });
    const worker = new Worker<MemoryJobData>(
      MEMORY_QUEUE,
      (job: Job<MemoryJobData>) =>
        runMemory(job.data, { db, engine, cleanupDays: env.MEMORY_CLEANUP_DAYS }),
      { connection, concurrency: env.MEMORY_CONCURRENCY },
    );
    worker.on('completed', (job, result: MemoryResult) =>
      console.warn(`[memory] ${result.task} (${job.data.orgId}) → ${result.detail}`),
    );
    worker.on('failed', (job, err) =>
      console.error(`[memory] ${job?.data.task ?? '?'} failed: ${err.message}`),
    );
    workers.push(worker);
    console.warn(`[workers] memory worker listening (concurrency=${env.MEMORY_CONCURRENCY})`);
  }

  if (workers.length === 0) {
    console.warn(`[workers] type=${env.WORKER_TYPE} has no consumers yet — idling`);
  }

  // Graceful drain: stop accepting jobs, finish in-flight, close connections.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.warn(`[workers] ${signal} — draining…`);
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[workers] fatal:', err);
  process.exit(1);
});
