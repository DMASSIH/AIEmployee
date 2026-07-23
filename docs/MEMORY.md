# Memory & Context (Milestone 11)

Durable, cross-conversation memory for every AI Employee. The runtime remembers
stable facts and preferences (**semantic**) and notable events from past
conversations (**episodic**), retrieves the most relevant memories before each
inference, and injects them into the prompt ahead of RAG. Extraction,
summarization, embedding, and cleanup all run in the **background** — never in a
request handler.

Built entirely on the existing platform: M9 embeddings + pgvector +
`estimateTokens`, M10 runtime + conversation summaries + BullMQ, `withOrg` RLS,
`writeAudit`, and the provider abstraction. Nothing was rebuilt.

## Architecture

```
apps/web (/memory) ──► apps/api (modules/memory) ──► Postgres (memories, pgvector+HNSW, RLS)
                              │  enqueue extract/summarize/embed (BullMQ)   ▲
   runtime turn ──────────────┤                                            │ memories
   (retrieve before inference)│                                            │
                              ▼                                            │
                        apps/workers (memory) ──► @aie/memory (MemoryEngine)
                                                    extract → embed → dedup → persist
                                                    summarize · reindex · cleanup
```

### `@aie/memory` — the engine (dependency-injected)

Reusable by the runtime, workers, and API. The AI provider is injected as a
narrow `MemoryChatProvider` (a **structural subset** of `@aie/ai`'s
`AIProvider`), so `@aie/memory` never imports `@aie/ai` — which imports
`@aie/memory` — keeping the dependency graph acyclic.

| Module | Responsibility |
|---|---|
| `ranking.ts` | Pure, tunable scoring: **similarity × importance × recency × frequency** → combined score; token-budget selection |
| `retrieval.ts` | `retrieveMemories` — embed query → pgvector candidates (RLS) → rank → trim to budget → record access |
| `repository.ts` | Storage/CRUD, soft delete/restore, keyset reindex, org-scoped vector search |
| `extraction.ts` | Provider-agnostic memory extraction from a transcript (strict JSON, tolerant parser) |
| `summarization.ts` | Provider-agnostic rolling conversation summary; transcript rendering |
| `dedup.ts` | Exact (normalized) + semantic (cosine ≥ threshold) deduplication, batch-aware |
| `embedding.ts` | Batched memory embedding (wraps M9 `embedInBatches`) |
| `engine.ts` | `MemoryEngine` — the background orchestrator (extract/embed/reindex/cleanup + retrieve) |

**Tenant isolation:** every query runs through `withOrg`, including the raw
pgvector search, so memories and retrieval are RLS-scoped to the org. Verified as
the non-superuser `aie_app` role.

## Database (migration `0007`)

New `memories` table (RLS-forced tenant isolation, mirrors the M2 policy):

| Column | Notes |
|---|---|
| `type` | `memory_type` enum: `semantic` \| `episodic` |
| `content` | The remembered statement |
| `importance` | `smallint` 1 (trivial) … 5 (critical) — drives ranking + retention |
| `access_count`, `last_accessed_at` | Frequency + recency signals, bumped on retrieval |
| `embedding` | `vector(1536)` (matches the M9 provider + `knowledge_chunks`) + `embedding_model` |
| `employee_id` | Null = org-wide memory; set = scoped to one employee |
| `source_conversation_id` | Which conversation it was extracted from (null = manual) |
| `deleted_at` | Soft delete; purged by the cleanup worker after a retention window |

Indexes: `memories_org_scope_idx (org_id, employee_id, type)`,
`memories_org_source_idx`, and an **HNSW** index on `embedding`
(`vector_cosine_ops`) for fast cosine retrieval at scale.

## Ranking

A memory's final score is a weighted sum of four signals, each normalized to
`[0, 1]` (weights sum to 1, so the score stays in `[0, 1]`):

| Signal | How | Default weight |
|---|---|---|
| **Similarity** | pgvector cosine to the query (`1 − distance`) | 0.55 |
| **Importance** | `(importance − 1) / 4` | 0.20 |
| **Recency** | exponential decay `2^(−age / halfLife)`, 30-day half-life | 0.15 |
| **Frequency** | log-scaled `log1p(accessCount) / log1p(saturation)` | 0.10 |

Retrieval over-fetches candidates (`candidateK ≫ topK`) so ranking can promote a
high-importance or recently-used memory that isn't the single closest vector.
The scoring is pure and unit-tested, and the API surfaces the full breakdown
(`ScoredMemory`) so the UI can show *why* a memory was retrieved.

## Prompt pipeline

The runtime (`runAssistant`) retrieves memory and RAG **in parallel**, then
assembles the prompt in this canonical order:

1. **System Prompt** — employee persona
2. **Semantic Memory** — stable facts / preferences
3. **Episodic Memory** — relevant past interactions
4. **RAG Knowledge** — cited passages (M9)
5. **Recent Conversation** — short-term history, auto-trimmed to a token budget
6. **Current User Message**

Each context block has its own token budget; the recent-conversation window is
trimmed oldest-first (`trimHistory`) so long threads never overflow the context.
Retrieved memories are emitted as a `memories` stream event (and their access
counts bumped), so the UI can show what informed the reply.

## Background workers

After a conversation turn persists, the API enqueues `extract` + `summarize`
jobs (best-effort — a Redis hiccup never fails the user's turn). The memory
worker (`WORKER_TYPE=memory|all`) drives the `MemoryEngine`:

| Job | Work |
|---|---|
| `extract` | Load transcript → LLM extract → embed → dedup (vs. this conversation + batch) → persist |
| `summarize` | Load transcript → LLM summary → persist to `conversations.summary` |
| `embed` | Backfill embeddings for memories created without one (e.g. manual) |
| `reindex` | Recompute embeddings (one memory, or the whole org after a model change) |
| `cleanup` | Hard-delete memories soft-deleted before the retention cutoff |

All jobs are org-scoped and retry-safe: extract dedupes, embed/reindex are
idempotent recomputations, summarize/cleanup are last-writer-wins.

## API

All routes under `/v1`, authenticated + org-scoped; writes require `canWrite`,
are audited (`writeAudit`), and search/regenerate are rate-limited.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/memories` | List (filter by content/type/employee, paginate, include-deleted) |
| `POST` | `/memories/search` | Ranked semantic search (does **not** bump access) |
| `GET` | `/memories/:id` | Get one |
| `POST` | `/memories` | Create manually → enqueue `embed` |
| `PATCH` | `/memories/:id` | Edit; on content change clears the stale embedding → enqueue `reindex` |
| `DELETE` | `/memories/:id` | Soft delete |
| `POST` | `/memories/:id/restore` | Restore a soft-deleted memory |
| `GET` | `/memories/conversations/:id/summary` | Read the rolling conversation summary |
| `POST` | `/memories/conversations/:id/summary/regenerate` | Enqueue a background summarize job (202) |

## Frontend

Reuses `@aie/ui` and the dashboard shell (no redesign):

- **`/memory`** — Manage tab (filter, create/edit/delete/restore) and Search tab
  (semantic search with a **ranking inspector** — similarity/importance/recency/
  frequency bars + combined score).
- **Memory Inspector** dialog — a memory's content, badges, and score breakdown.
- **Conversation Summary viewer** on the conversation detail page, with a
  background **Regenerate** action.

## Verification

- `@aie/memory`: 18 unit tests (ranking signals, dedup, extraction parsing,
  transcript rendering).
- API: 9 integration tests (CRUD, validation, authorization, **cross-org
  isolation**, soft delete/restore) as the least-privilege `aie_app` role.
- Live end-to-end worker run: extract → dedup → summarize → ranked retrieve →
  cross-org isolation (0 leakage) → embed → cleanup.
- Full workspace `lint`, `typecheck`, `test`, `build` green.
