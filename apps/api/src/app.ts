import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { dbPlugin } from './plugins/db.js';
import { redisPlugin } from './plugins/redis.js';
import { sessionPlugin } from './plugins/session.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './modules/auth/routes.js';
import { orgContextPlugin } from './modules/orgs/plugin.js';
import { orgRoutes } from './modules/orgs/routes.js';
import { employeeRoutes } from './modules/employees/routes.js';
import { knowledgePlugin } from './plugins/knowledge.js';
import { knowledgeRoutes } from './modules/knowledge/routes.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      ...(env.NODE_ENV !== 'production' && {
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }),
    },
    // Behind a proxy/ALB in prod — trust X-Forwarded-For for rate limiting.
    trustProxy: env.NODE_ENV === 'production',
  }).withTypeProvider<ZodTypeProvider>();

  // Zod as the validation/serialization layer — schemas shared with @aie/core.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet);
  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(multipart, { limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 } });
  await app.register(rateLimit, {
    global: true,
    max: 300, // per-route overrides come later (auth endpoints get much stricter)
    timeWindow: '1 minute',
  });

  // Dependency plugins: decorate app.db / app.redis and fail fast if either is
  // unreachable at boot. Registered before routes so health checks can use them.
  await app.register(dbPlugin, { databaseUrl: env.DATABASE_URL });
  await app.register(redisPlugin, { redisUrl: env.REDIS_URL });

  // Redis-backed sessions (cookie carries only an opaque id). Needs app.redis.
  await app.register(sessionPlugin, {
    ttlSeconds: env.SESSION_TTL_SECONDS,
    secure: env.NODE_ENV === 'production',
  });
  // Org authorization middleware (app.requireOrg) — needs session + db.
  await app.register(orgContextPlugin);
  // Knowledge infrastructure: object storage, ingest queue producer, embeddings.
  await app.register(knowledgePlugin, {
    redisUrl: env.REDIS_URL,
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
      bucket: env.S3_BUCKET,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    },
    embeddingProvider: env.EMBEDDING_PROVIDER,
    openaiApiKey: env.OPENAI_API_KEY,
  });

  await app.register(healthRoutes);

  // Product API under /v1.
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(orgRoutes, { prefix: '/v1' });
  await app.register(employeeRoutes, { prefix: '/v1' });
  await app.register(knowledgeRoutes, { prefix: '/v1' });
  await app.register(
    (v1, _opts, done) => {
      v1.get('/', () => ({ name: 'AI Employee API', version: 'v1' }));
      done();
    },
    { prefix: '/v1' },
  );

  return app;
}
