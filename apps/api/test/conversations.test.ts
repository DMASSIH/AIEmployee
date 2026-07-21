import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import type { Env } from '../src/config/env.js';
import type { StreamEvent } from '@aie/core';

/**
 * Conversation runtime against real Postgres + Redis + MinIO as `aie_app`,
 * using the offline `echo` AI provider (no API key) so streaming, RAG, token
 * accounting, and persistence are all exercised hermetically. Opt-in via
 * INTEGRATION=1.
 */
const RUN = process.env.INTEGRATION === '1';

const env: Env = {
  NODE_ENV: 'production',
  API_PORT: 0,
  API_HOST: '127.0.0.1',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://aie_app:dev@localhost:5432/aie',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-chars',
  WEB_ORIGIN: 'http://localhost:3000',
  SESSION_TTL_SECONDS: 3600,
  S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',
  S3_BUCKET: process.env.S3_BUCKET ?? 'aie-dev',
  S3_FORCE_PATH_STYLE: true,
  MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
  EMBEDDING_PROVIDER: 'local',
  AI_PROVIDER: 'echo',
  AI_CHAT_MODEL: 'gpt-4o-mini',
};

type App = Awaited<ReturnType<typeof buildApp>>;
type Res = Awaited<ReturnType<App['inject']>>;
const cookieOf = (res: Res): string => {
  const sid = res.cookies.find((c) => c.name === 'sid');
  return sid ? `sid=${sid.value}` : '';
};

function parseSse(payload: string): StreamEvent[] {
  return payload
    .split('\n\n')
    .map((f) => f.trim())
    .filter((f) => f.startsWith('data:'))
    .map((f) => JSON.parse(f.slice(5).trim()) as StreamEvent);
}

async function newOrgUser(app: App, slug: string): Promise<string> {
  const email = `conv-${randomUUID()}@example.com`;
  const password = 'correct horse battery staple';
  await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, displayName: 'Conv', password } });
  const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email, password } });
  const cookie = cookieOf(login);
  await app.inject({ method: 'POST', url: '/v1/organizations', headers: { cookie }, payload: { name: 'Conv', slug } });
  return cookie;
}

async function createEmployee(app: App, cookie: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/employees',
    headers: { cookie },
    payload: {
      name: 'Ada',
      roleTitle: 'Support Agent',
      jobDescription: 'Answer customer questions about billing, refunds and shipping clearly.',
    },
  });
  return res.json().id;
}

describe.skipIf(!RUN)('conversations & AI runtime', () => {
  let app: App;
  let cookie = '';
  const suffix = randomUUID().slice(0, 8);
  let employeeId = '';
  let conversationId = '';

  beforeAll(async () => {
    app = await buildApp(env);
    cookie = await newOrgUser(app, `conv-org-${suffix}`);
    employeeId = await createEmployee(app, cookie);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthenticated access (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/conversations' });
    expect(res.statusCode).toBe(401);
  });

  it('creates a conversation for an employee (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: { cookie },
      payload: { employeeId, title: 'Billing help' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    conversationId = body.id;
    expect(body).toMatchObject({ employeeId, title: 'Billing help', status: 'open', employeeName: 'Ada' });
  });

  it('rejects a conversation for a missing employee (404)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/conversations',
      headers: { cookie },
      payload: { employeeId: randomUUID() },
    });
    expect(res.statusCode).toBe(404);
  });

  it('streams an assistant reply with usage (SSE) and persists both messages', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${conversationId}/messages/stream`,
      headers: { cookie },
      payload: { content: 'How long do refunds take?' },
    });
    expect(res.statusCode).toBe(200);
    const events = parseSse(res.payload);
    expect(events[0]?.type).toBe('start');
    expect(events.some((e) => e.type === 'token')).toBe(true);
    const done = events.find((e) => e.type === 'done');
    expect(done).toBeDefined();
    if (done && done.type === 'done') {
      expect(done.usage.totalTokens).toBeGreaterThan(0);
      expect(done.usage.model).toBeTruthy();
    }

    // Both the user and assistant messages were persisted.
    const messages = await app.inject({ method: 'GET', url: `/v1/conversations/${conversationId}/messages`, headers: { cookie } });
    const list = messages.json() as { role: string; totalTokens: number | null }[];
    expect(list).toHaveLength(2);
    expect(list[0]!.role).toBe('user');
    expect(list[1]!.role).toBe('assistant');
    expect(list[1]!.totalTokens).toBeGreaterThan(0);
  });

  it('lists conversations and reflects the message count', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/conversations', headers: { cookie } });
    const conv = (res.json().items as { id: string; messageCount: number }[]).find((c) => c.id === conversationId);
    expect(conv?.messageCount).toBe(2);
  });

  it('updates conversation status', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/conversations/${conversationId}`,
      headers: { cookie },
      payload: { status: 'resolved' },
    });
    expect(res.json().status).toBe('resolved');
  });

  it('summarizes the conversation', async () => {
    const res = await app.inject({ method: 'POST', url: `/v1/conversations/${conversationId}/summarize`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(typeof res.json().summary).toBe('string');
  });

  it('isolates conversations across organizations', async () => {
    const other = await newOrgUser(app, `conv-other-${suffix}`);
    const list = await app.inject({ method: 'GET', url: '/v1/conversations', headers: { cookie: other } });
    expect(list.json().items).toEqual([]);
    const get = await app.inject({ method: 'GET', url: `/v1/conversations/${conversationId}`, headers: { cookie: other } });
    expect(get.statusCode).toBe(404);
    const stream = await app.inject({
      method: 'POST',
      url: `/v1/conversations/${conversationId}/messages/stream`,
      headers: { cookie: other },
      payload: { content: 'hi' },
    });
    expect(stream.statusCode).toBe(404);
  });

  it('soft-deletes a conversation (204 → 404)', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/v1/conversations/${conversationId}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const get = await app.inject({ method: 'GET', url: `/v1/conversations/${conversationId}`, headers: { cookie } });
    expect(get.statusCode).toBe(404);
  });
});
