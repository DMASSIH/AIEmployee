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
