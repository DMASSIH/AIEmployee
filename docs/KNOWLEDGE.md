# Knowledge Base & RAG Foundation (Milestone 9)

The knowledge-management and retrieval layer every AI Employee will use. Upload
documents, process them into embedded chunks, and retrieve citation-annotated
context by semantic search. **No LLM generation** — this milestone is the
knowledge + retrieval engine only.

## Architecture

```
apps/web ──► apps/api (modules/knowledge) ──► Postgres (pgvector, RLS)
                    │  upload → MinIO/S3            ▲
                    │  enqueue ingest (BullMQ)      │ chunks + embeddings
                    ▼                               │
              apps/workers (ingest) ──► @aie/knowledge (extract→chunk→embed)
```

**`@aie/knowledge`** is a shared package (reusable by workers, API, and the
future runtime):

| Module | Responsibility |
|---|---|
| `embeddings/` | Provider-agnostic `EmbeddingProvider`; `Local` (deterministic, 1536-dim, offline) + `OpenAI`; env-selected factory |
| `extract/` | Pluggable extractor **registry** — pdf, docx, txt, md. Add a format by registering an extractor; the pipeline never changes |
| `chunk.ts` | Heading-aware, token-bounded chunking with overlap; page-tagged for PDFs |
| `storage.ts` | `StorageProvider` interface + S3/MinIO implementation |
| `pipeline.ts` | `processDocument` / `processText` (extract → chunk → embed) — DB-free, unit-tested |
| `retrieval.ts` | `vectorSearch` (pgvector cosine, RLS-scoped) + `buildContext` (citations + token budget) + `retrieve` (the RAG entry point) |

**Tenant isolation:** every query runs through `withOrg` — including the raw
pgvector search — so documents, chunks, and retrieval are RLS-scoped to the org.
Verified as the non-superuser `aie_app` role.

## Database (migration `0005`)

Extends the M2 tables (`knowledge_sources`, `knowledge_chunks` with `vector(1536)`
+ HNSW, `files`):
- New `knowledge_collections` table (RLS-forced, unique slug per org).
- `knowledge_sources` (documents): `+ collection_id, mime_type, created_by, updated_at`.
- `knowledge_chunks`: `+ token_count, embedding_model` (embedding metadata).

## Processing pipeline

1. **Upload** (`POST /knowledge/documents/upload`, multipart): server-side
   magic-byte sniff (`file-type`, extension fallback for text) → store to
   MinIO (`orgs/{orgId}/files/{fileId}`) → create `files` + `knowledge_sources`
   rows (`pending`) → enqueue an `ingest` job.
2. **Worker** (`apps/workers`, BullMQ `ingest`): mark `processing` → download →
   `extract → chunk → embed` → atomically replace chunks → mark `ready`
   (or `failed` with the error). Idempotent, so retry/re-index heal.
3. **Retry** re-enqueues; **delete** soft-deletes the document and reclaims its
   chunks + stored object.

Each stage is independently testable — the extractor registry, chunker,
embeddings, and context builder all have hermetic unit tests in `@aie/knowledge`.

## Embeddings — provider abstraction

Nothing outside `@aie/knowledge/embeddings` references a concrete provider.
`EMBEDDING_PROVIDER=local` (default) uses a deterministic in-process provider
(no API key, reproducible in CI); `=openai` uses text-embedding-3-small. Both
emit 1536-dim vectors matching the DB column; swapping providers is one env var.

## API (`/v1/knowledge`)

| Method | Path | Notes |
|---|---|---|
| GET | `/collections` | List collections (with document counts) |
| POST · PATCH · DELETE | `/collections[/:id]` | CRUD (soft delete) |
| GET | `/documents` | List — `q`, `status`, `collectionId`, sort, pagination |
| GET | `/documents/:id` | Single document |
| POST | `/documents/upload` | Multipart file upload (pdf/docx/txt/md) |
| POST | `/documents` | Create from pasted text |
| POST | `/documents/:id/retry` | Re-run the pipeline |
| DELETE | `/documents/:id` | Soft delete + reclaim chunks/object |
| POST | `/retrieve` | Embed query → pgvector search → cited, budgeted context |

Reads require org membership; writes require `owner`/`admin`/`manager`.
Mutations emit append-only `audit_logs`.

## Frontend

`hooks/use-knowledge.ts` (React Query) over `api.knowledge.*`. The Knowledge page
does collections (create/delete), document upload + live processing status
(auto-refetch while pending/processing), name search, retry, delete, and a
semantic "ask your knowledge" search that surfaces cited passages.

## Testing

- `@aie/knowledge`: hermetic unit tests (tokens, embeddings, chunking, context, pipeline).
- `apps/api/test/knowledge.test.ts`: collections/documents CRUD, search/filter/
  pagination, retrieval shape, org isolation — as `aie_app` (`INTEGRATION=1`, CI
  provisions Postgres + Redis + MinIO).
- Verified end-to-end locally: upload → worker ingest → retrieve with citations,
  cross-org isolation, unsupported-type rejection, soft-delete.

## Config

`S3_*` (MinIO/S3), `MAX_UPLOAD_BYTES`, `EMBEDDING_PROVIDER`, optional
`OPENAI_API_KEY` — all validated in `apps/api/src/config/env.ts` and the worker env.
