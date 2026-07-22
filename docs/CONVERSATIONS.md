# Conversations & AI Runtime (Milestone 10)

Turns AI Employees into conversational agents: a provider-agnostic AI runtime
that assembles prompts, retrieves M9 knowledge (RAG), streams model replies, and
persists messages + token usage. **Consumes** the M9 retrieval engine — it does
not rebuild it.

## Provider abstraction (`@aie/ai`)

The runtime never imports a model SDK directly — only the `AIProvider` interface:

```
chat(req) · stream(req) · tool calling · structured output · usage · modelInfo · typed errors
```

| Provider | Notes |
|---|---|
| `OpenAIProvider` | First real implementation (chat completions, streaming, tools, JSON mode, usage) |
| `EchoProvider` | Deterministic offline default (dev/CI) — streams a context-aware reply, no API key |

`createAIProvider({provider})` selects by `AI_PROVIDER` (`echo` \| `openai`).
Adding Anthropic/Gemini/Grok/DeepSeek/OpenRouter = a new file under `provider/`
+ a factory case; **no runtime, API, or frontend change**.

**Tool calling** is a wired framework (`ToolRegistry`) — advertised to providers
and executed in a loop — but **no business tools are registered in M10** (scope).

## Runtime (`@aie/ai/runtime`)

`runAssistant()` is the orchestrator and is transport-agnostic (async generator):

1. **RAG** — `retrieve()` (M9) for org-scoped context + citations.
2. **Prompt assembly** — employee system prompt + cited context + short-term history + the new user message.
3. **Model invocation** — `provider.stream()`; yields `citations`, `token`, and `final` (content + usage) events.

The API layer adapts these to **SSE** and owns persistence, rate limiting, and auth.

## Database (migration `0006`)

Reuses `conversations` + `messages` (RLS-forced; `messages.content` is JSONB
content-blocks mirroring the LLM wire format). `conversations` gains
`title, summary, created_by, last_message_at, updated_at, deleted_at`. Token
accounting persists per-message `input_tokens/output_tokens/model/latency_ms`,
and increments `usage_counters` (`tokens_in`, `tokens_out`, `tasks`). Cost is
estimated from tokens+model via the `@aie/ai` pricing map.

## API (`/v1/conversations`)

| Method | Path | Notes |
|---|---|---|
| GET | `/conversations` | List — `q`, `status`, `employeeId`, sort, pagination |
| POST | `/conversations` | Create (employee selector) |
| GET | `/conversations/:id` | Conversation |
| GET | `/conversations/:id/messages` | History (text + citations + usage/cost) |
| PATCH · DELETE | `/conversations/:id` | Update (title/status) · soft delete |
| POST | `/conversations/:id/messages/stream` | **SSE** chat turn — rate-limited |
| POST | `/conversations/:id/summarize` | Conversation summary |

Reads require org membership; writes require `owner`/`admin`/`manager`. Every
turn is org + employee isolated by RLS and emits append-only `audit_logs`.

### SSE contract

Each `data:` frame is a JSON `StreamEvent` (`@aie/core`):
`start` → `citations` → `token`* → `done{usage}` (or `error`). The web client
reads the `fetch` `ReadableStream` and renders tokens incrementally.

## Frontend

`hooks/use-conversations.ts` + `api.conversations.*` (incl. the SSE reader).
The `/conversations` list gets a "new conversation" employee-selector dialog;
the chat window streams tokens live with Markdown/code blocks, M9 citation
chips, per-message token/cost/latency, and full history. No redesign.

## Configuration

`AI_PROVIDER` (`echo`\|`openai`), `AI_CHAT_MODEL`, optional `OPENAI_API_KEY` /
`OPENAI_BASE_URL` — validated in `apps/api/src/config/env.ts`.

## Testing

- `@aie/ai`: hermetic unit tests (echo provider, pricing, tool registry, prompt assembly).
- `apps/api/test/conversations.test.ts`: create → **SSE stream** → persistence →
  token accounting → summarize → org isolation → soft delete, as `aie_app` with
  the echo provider (`INTEGRATION=1`; CI provisions Postgres + Redis + MinIO).

Short-term memory = the last N turns fed into the prompt. Long-term memory is a
later milestone.
