import { z } from 'zod';

/**
 * Fail fast: the process refuses to boot with a bad environment.
 * Every new env var gets added HERE first — never read process.env elsewhere.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  COOKIE_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  // Session lifetime (seconds). Applies to both the Redis TTL and cookie maxAge.
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),

  // ---- Object storage (MinIO locally, S3 in prod) — Milestone 9 ----
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_BUCKET: z.string().default('aie-dev'),
  // MinIO needs path-style addressing; real S3 uses virtual-host style.
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  // Largest single knowledge upload accepted (bytes). Default 25 MB.
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),

  // ---- Embeddings — provider-agnostic (Milestone 9) ----
  // `local` = deterministic in-process provider (no external calls, dev/CI).
  // `openai` = text-embedding-3-small; requires OPENAI_API_KEY.
  EMBEDDING_PROVIDER: z.enum(['local', 'openai']).default('local'),
  OPENAI_API_KEY: z.string().optional(),

  // ---- AI runtime — provider-agnostic (Milestone 10) ----
  // `echo` = deterministic offline provider (dev/CI, no key); `openai` = live.
  AI_PROVIDER: z.enum(['echo', 'openai']).default('echo'),
  AI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment:\n', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}
