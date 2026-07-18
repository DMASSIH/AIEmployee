import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { withTimeout } from '../lib/with-timeout.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Shared ioredis client. Injected, never a global. */
    redis: Redis;
  }
}

export interface RedisPluginOptions {
  redisUrl: string;
}

/**
 * Decorates the app with a single shared Redis client (ioredis).
 *
 * - `enableOfflineQueue: false` makes commands fail fast while disconnected, so
 *   /readyz reports a real 503 instead of queueing forever.
 * - `retryStrategy` reconnects with capped backoff but gives up after 10 tries,
 *   so a permanently gone Redis surfaces via /readyz rather than retrying silently.
 * - Startup connect is bounded by a timeout to fail fast on an unreachable host.
 * - The client is quit on shutdown via the onClose hook.
 */
export const redisPlugin = fp<RedisPluginOptions>(
  async (app, opts) => {
    const redis = new Redis(opts.redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => (times > 10 ? null : Math.min(times * 200, 2000)),
    });

    redis.on('ready', () => app.log.info('Redis connected'));
    redis.on('error', (err) => app.log.error({ err: err.message }, 'Redis error'));
    redis.on('reconnecting', () => app.log.warn('Redis reconnecting'));

    await withTimeout(redis.connect(), 5000, 'Redis connect timeout');

    app.decorate('redis', redis);

    app.addHook('onClose', async () => {
      await redis.quit();
      app.log.info('Redis disconnected');
    });
  },
  { name: 'redis' },
);
