'use client';

import { useState } from 'react';
import { Brain, Loader2, Plus, RotateCcw, Search, Sparkles, Trash2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  EmptyState,
  Field,
  Input,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@aie/ui';
import type { CreateMemoryInput, MemoryType, MemoryView, ScoredMemory } from '@aie/core';
import { PageHeader } from '@/components/shell/page-header';
import {
  useCreateMemory,
  useDeleteMemory,
  useMemories,
  useRestoreMemory,
  useSearchMemories,
  useUpdateMemory,
} from '@/hooks/use-memory';
import { ApiError, type MemoryListParams } from '@/lib/api';
import { formatRelative } from '@/lib/format';

const typeTone = { semantic: 'info', episodic: 'neutral' } as const;

/** 1..5 importance → a coarse tone so the list scans quickly. */
function importanceTone(importance: number): 'neutral' | 'warning' | 'danger' {
  if (importance >= 5) return 'danger';
  if (importance >= 3) return 'warning';
  return 'neutral';
}

export default function MemoryPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MemoryType | 'all'>('all');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MemoryView | null>(null);
  const [inspecting, setInspecting] = useState<{ memory: MemoryView; scored?: ScoredMemory } | null>(null);
  const [toDelete, setToDelete] = useState<MemoryView | null>(null);

  const params: MemoryListParams = {
    q: query.trim() || undefined,
    type: type === 'all' ? undefined : type,
    includeDeleted,
  };
  const { data, isLoading } = useMemories(params);
  const memories = data?.items ?? [];

  const del = useDeleteMemory();
  const restore = useRestoreMemory();

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success('Memory deleted', 'It can be restored from the deleted view.');
    } catch (err) {
      toast.error('Could not delete memory', err instanceof ApiError ? err.message : 'Please try again.');
    } finally {
      setToDelete(null);
    }
  };

  const onRestore = async (m: MemoryView) => {
    try {
      await restore.mutateAsync(m.id);
      toast.success('Memory restored');
    } catch (err) {
      toast.error('Could not restore memory', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Memory"
        description="What your AI employees remember — durable facts, preferences, and past interactions."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> New memory
          </Button>
        }
      />

      <Tabs defaultValue="manage">
        <TabsList>
          <TabsTrigger value="manage">Manage</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        {/* ------------------------------ manage ----------------------------- */}
        <TabsContent value="manage" className="mt-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Filter memories…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
            />
            <Select value={type} onValueChange={(v) => setType(v as MemoryType | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="semantic">Semantic</SelectItem>
                <SelectItem value="episodic">Episodic</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={includeDeleted ? 'primary' : 'outline'}
              onClick={() => setIncludeDeleted((v) => !v)}
            >
              {includeDeleted ? 'Showing deleted' : 'Show deleted'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : memories.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No memories yet"
              description="Memories are extracted automatically from conversations, or you can add one manually."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {memories.map((m) => (
                <MemoryRow
                  key={m.id}
                  memory={m}
                  onInspect={() => setInspecting({ memory: m })}
                  onEdit={() => {
                    setEditing(m);
                    setFormOpen(true);
                  }}
                  onDelete={() => setToDelete(m)}
                  onRestore={() => void onRestore(m)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------ search ----------------------------- */}
        <TabsContent value="search" className="mt-5">
          <MemorySearch onInspect={(memory, scored) => setInspecting({ memory, scored })} />
        </TabsContent>
      </Tabs>

      <MemoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
      <MemoryInspector
        open={!!inspecting}
        onOpenChange={(v) => !v && setInspecting(null)}
        memory={inspecting?.memory ?? null}
        scored={inspecting?.scored}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete this memory?"
        description="It is soft-deleted and can be restored from the deleted view."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={onDelete}
      />
    </div>
  );
}

/* -------------------------------- memory row ------------------------------ */

function MemoryRow({
  memory,
  onInspect,
  onEdit,
  onDelete,
  onRestore,
}: {
  memory: MemoryView;
  onInspect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <button type="button" onClick={onInspect} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm text-text">{memory.content}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={typeTone[memory.type]} className="capitalize">
              {memory.type}
            </Badge>
            <Badge tone={importanceTone(memory.importance)}>importance {memory.importance}</Badge>
            <span className="text-xs text-text-2">used {memory.accessCount}×</span>
            <span className="text-xs text-text-2">· {formatRelative(memory.createdAt)}</span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onRestore} title="Restore">
            <RotateCcw className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- search box ------------------------------ */

function MemorySearch({
  onInspect,
}: {
  onInspect: (memory: MemoryView, scored: ScoredMemory) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ScoredMemory[] | null>(null);
  const search = useSearchMemories();

  const run = async () => {
    if (!q.trim()) return;
    try {
      const res = await search.mutateAsync({ query: q.trim(), topK: 10, minScore: 0 });
      setResults(res.memories);
    } catch {
      toast.error('Search failed', 'Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-2 py-4">
          <Input
            placeholder="Semantic search across memories…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void run()}
          />
          <Button onClick={() => void run()} disabled={search.isPending}>
            {search.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </Button>
        </CardContent>
      </Card>

      {results && results.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No matches"
          description="No memories scored above the threshold for that query."
        />
      )}

      {results && results.length > 0 && (
        <div className="flex flex-col gap-3">
          {results.map((m) => (
            <Card key={m.id}>
              <CardContent className="py-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() =>
                    onInspect(
                      {
                        id: m.id,
                        organizationId: '',
                        employeeId: null,
                        type: m.type,
                        content: m.content,
                        importance: m.importance,
                        accessCount: 0,
                        lastAccessedAt: null,
                        sourceConversationId: m.sourceConversationId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      },
                      m,
                    )
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm text-text">{m.content}</p>
                    <Badge tone="success">{m.score.toFixed(3)}</Badge>
                  </div>
                  <ScoreBars scored={m} />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- ranking inspector -------------------------- */

function ScoreBars({ scored }: { scored: ScoredMemory }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Similarity', value: scored.similarity },
    { label: 'Importance', value: (scored.importance - 1) / 4 },
    { label: 'Recency', value: scored.recency },
    { label: 'Frequency', value: scored.frequency },
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-text-2">
            <span>{r.label}</span>
            <span>{r.value.toFixed(2)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(1, r.value)) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- inspector ------------------------------- */

function MemoryInspector({
  open,
  onOpenChange,
  memory,
  scored,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  memory: MemoryView | null;
  scored?: ScoredMemory;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Memory inspector" description="The stored memory and its ranking signals." />
        {memory && (
          <div className="flex flex-col gap-4">
            <p className="rounded-md bg-surface-2 p-3 text-sm text-text">{memory.content}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={typeTone[memory.type]} className="capitalize">
                {memory.type}
              </Badge>
              <Badge tone={importanceTone(memory.importance)}>importance {memory.importance}</Badge>
              {memory.sourceConversationId && <Badge tone="neutral">from conversation</Badge>}
            </div>
            {scored ? (
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-text">Combined score</span>
                  <span className="text-text">{scored.score.toFixed(3)}</span>
                </div>
                <ScoreBars scored={scored} />
              </div>
            ) : (
              <p className="text-xs text-text-2">
                Used {memory.accessCount}× · created {formatRelative(memory.createdAt)}
                {memory.lastAccessedAt ? ` · last used ${formatRelative(memory.lastAccessedAt)}` : ''}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ create / edit ----------------------------- */

function MemoryFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MemoryView | null;
}) {
  const create = useCreateMemory();
  const update = useUpdateMemory();
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('semantic');
  const [importance, setImportance] = useState('3');

  // Sync form when the dialog opens for a specific memory (or a fresh create).
  const [syncedId, setSyncedId] = useState<string | null>(null);
  if (open && editing && syncedId !== editing.id) {
    setSyncedId(editing.id);
    setContent(editing.content);
    setType(editing.type);
    setImportance(String(editing.importance));
  }
  if (open && !editing && syncedId !== null) {
    setSyncedId(null);
    setContent('');
    setType('semantic');
    setImportance('3');
  }

  const submit = async () => {
    if (!content.trim()) return;
    try {
      if (editing) {
        await update.mutateAsync({
          id: editing.id,
          input: { content: content.trim(), importance: Number(importance) },
        });
        toast.success('Memory updated');
      } else {
        const input: CreateMemoryInput = {
          content: content.trim(),
          type,
          importance: Number(importance),
        };
        await create.mutateAsync(input);
        toast.success('Memory created', 'It will be embedded for search shortly.');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error('Could not save memory', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader
          title={editing ? 'Edit memory' : 'New memory'}
          description="A short, standalone fact or preference to remember."
        />
        <div className="flex flex-col gap-4">
          <Field label="Content" required>
            {(p) => (
              <Textarea
                id={p.id}
                rows={3}
                placeholder="e.g. Prefers replies in Swedish."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              {(p) => (
                <Select value={type} onValueChange={(v) => setType(v as MemoryType)} disabled={!!editing}>
                  <SelectTrigger id={p.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semantic">Semantic</SelectItem>
                    <SelectItem value="episodic">Episodic</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Field label="Importance">
              {(p) => (
                <Select value={importance} onValueChange={setImportance}>
                  <SelectTrigger id={p.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={pending || !content.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
