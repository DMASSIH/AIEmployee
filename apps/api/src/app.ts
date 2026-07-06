import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Env } from './config/env.js';
import { healthRoutes } from './routes/health.js';

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
  await app.register(rateLimit, {
    global: true,
    max: 300, // per-route overrides come later (auth endpoints get much stricter)
    timeWindow: '1 minute',
  });

  await app.register(healthRoutes);
  await app.register(
    async (v1) => {
      // All product routes mount here in coming milestones:
      // v1.register(authRoutes); v1.register(employeeRoutes); ...
      v1.get('/', () => ({ name: 'AI Employee API', version: 'v1' }));
    },
    { prefix: '/v1' },
  );

  return app;
}
