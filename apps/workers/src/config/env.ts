import { z } from 'zod';

/** Fail-fast env for the worker process. Mirrors the API's storage/embedding vars. */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  WORKER_TYPE: z
    .enum(['all', 'ingest', 'memory', 'agent-runner', 'sync', 'billing'])
    .default('all'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('aie-dev'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),

  EMBEDDING_PROVIDER: z.enum(['local', 'openai']).default('local'),
  OPENAI_API_KEY: z.string().optional(),

  /** AI provider for memory extraction/summarization (echo in dev/CI). */
  AI_PROVIDER: z.enum(['echo', 'openai']).default('echo'),
  AI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  AI_BASE_URL: z.string().url().optional(),

  /** How many ingest jobs a worker runs at once. */
  INGEST_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  /** How many memory jobs a worker runs at once. */
  MEMORY_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  /** Soft-deleted memories older than this many days are purged by cleanup. */
  MEMORY_CLEANUP_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid worker environment:\n', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
