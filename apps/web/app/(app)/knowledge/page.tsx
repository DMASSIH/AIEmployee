'use client';

import { useState } from 'react';
import { BookOpen, FileText, FolderOpen, Loader2, Plus, RotateCcw, Search, Trash2, Upload } from 'lucide-react';
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
  FileUpload,
  Input,
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@aie/ui';
import type { DocumentView, RetrievalResult } from '@aie/core';
import { PageHeader } from '@/components/shell/page-header';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useDeleteDocument,
  useDocuments,
  useRetrieve,
  useRetryDocument,
  useUploadDocument,
} from '@/hooks/use-knowledge';
import { ApiError } from '@/lib/api';
import { formatBytes, formatNumber, formatRelative } from '@/lib/format';

const statusTone = { ready: 'success', processing: 'warning', failed: 'danger', pending: 'neutral' } as const;

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [toDelete, setToDelete] = useState<DocumentView | null>(null);

  const { data: docs, isLoading: docsLoading } = useDocuments({ q: query.trim() || undefined });
  const { data: collections } = useCollections();
  const documents = docs?.items ?? [];
  const processing = documents.filter((d) => d.status === 'pending' || d.status === 'processing');

  const remove = useDeleteDocument();
  const retry = useRetryDocument();

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Document deleted', `${toDelete.name} was removed.`);
    } catch {
      toast.error('Delete failed', 'Please try again.');
    }
    setToDelete(null);
  };

  const onRetry = async (doc: DocumentView) => {
    try {
      await retry.mutateAsync(doc.id);
      toast.success('Reprocessing', `${doc.name} was re-queued.`);
    } catch {
      toast.error('Retry failed', 'Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Knowledge"
        description="The sources your AI employees learn from. Upload, organize, and track processing."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" /> Upload
          </Button>
        }
      />

      {processing.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-2 py-3">
            <Loader2 className="size-4 animate-spin text-accent" />
            <p className="text-sm font-medium">
              Processing {processing.length} document{processing.length > 1 ? 's' : ''}…
            </p>
          </CardContent>
        </Card>
      )}

      <SemanticSearch />

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-5">
          <SearchInput
            className="mb-4 max-w-xs"
            placeholder="Search documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {docsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No documents"
              description="Upload a PDF, DOCX, TXT, or Markdown file to get started."
              action={{ label: 'Upload', onClick: () => setUploadOpen(true) }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-4 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                      <FileText className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-[13px] text-text-3">
                        {formatNumber(doc.chunkCount)} chunks
                        {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''} ·{' '}
                        {formatRelative(doc.updatedAt)}
                      </p>
                      {doc.status === 'failed' && doc.error && (
                        <p className="mt-0.5 truncate text-[12px] text-danger">{doc.error}</p>
                      )}
                    </div>
                    <Badge tone={statusTone[doc.status]} dot className="capitalize">
                      {doc.status}
                    </Badge>
                    {doc.status === 'failed' && (
                      <Button variant="ghost" size="icon-sm" aria-label="Retry" onClick={() => onRetry(doc)}>
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => setToDelete(doc)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(collections?.items ?? []).map((col) => (
              <CollectionCard key={col.id} id={col.id} name={col.name} count={col.documentCount} description={col.description} />
            ))}
            <button
              onClick={() => setCollectionOpen(true)}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-text-3 transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">New collection</span>
            </button>
          </div>
        </TabsContent>
      </Tabs>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
      <NewCollectionDialog open={collectionOpen} onOpenChange={setCollectionOpen} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? 'document'}?`}
        description="This removes the document and its chunks. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={onDelete}
      />
    </div>
  );
}

/* --------------------------- semantic search box -------------------------- */

function SemanticSearch() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const retrieve = useRetrieve();

  const run = async () => {
    if (!q.trim()) return;
    try {
      const res = await retrieve.mutateAsync({ query: q.trim(), topK: 5, minScore: 0, maxTokens: 4000 });
      setResult(res);
    } catch {
      toast.error('Search failed', 'Please try again.');
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask your knowledge base a question…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
          <Button onClick={run} disabled={retrieve.isPending || !q.trim()}>
            {retrieve.isPending ? <Spinner className="size-4" /> : <Search className="size-4" />} Search
          </Button>
        </div>
        {result && (
          <div className="flex flex-col gap-2">
            {result.chunks.length === 0 ? (
              <p className="text-[13px] text-text-3">No relevant passages found.</p>
            ) : (
              result.chunks.map((c) => (
                <div key={c.id} className="rounded-md border border-border bg-surface-2/40 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-accent">
                      [{c.citation}] {c.sourceName}
                    </span>
                    <span className="text-[12px] text-text-3">score {c.score.toFixed(3)}</span>
                  </div>
                  <p className="line-clamp-3 text-[13px] leading-relaxed text-text-2">{c.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- collection card ---------------------------- */

function CollectionCard({
  id,
  name,
  count,
  description,
}: {
  id: string;
  name: string;
  count: number;
  description: string | null;
}) {
  const del = useDeleteCollection();
  return (
    <Card className="group relative transition-all hover:-translate-y-0.5 hover:shadow-pop">
      <CardContent className="flex flex-col gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
          <FolderOpen className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-[13px] text-text-3">
            {count} document{count === 1 ? '' : 's'}
          </p>
        </div>
        {description && <p className="line-clamp-2 text-[13px] text-text-2">{description}</p>}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete collection"
          className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => {
            del.mutate(id, {
              onSuccess: () => toast.success('Collection deleted'),
              onError: () => toast.error('Delete failed'),
            });
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ upload dialog ----------------------------- */

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: collections } = useCollections();
  const upload = useUploadDocument();
  const [collectionId, setCollectionId] = useState<string>('none');

  const onFiles = async (files: File[]) => {
    const target = collectionId === 'none' ? undefined : collectionId;
    let ok = 0;
    for (const file of files) {
      try {
        await upload.mutateAsync({ file, collectionId: target });
        ok += 1;
      } catch (err) {
        toast.error(`Could not upload ${file.name}`, err instanceof ApiError ? err.message : 'Please try again.');
      }
    }
    if (ok > 0) toast.success(`${ok} document${ok > 1 ? 's' : ''} uploaded`, 'Processing starts automatically.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Upload knowledge" description="PDF, DOCX, TXT, or Markdown." />
        <div className="flex flex-col gap-4">
          <Field label="Collection (optional)">
            {(p) => (
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger id={p.id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collection</SelectItem>
                  {(collections?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <FileUpload
            hint={upload.isPending ? 'Uploading…' : 'PDF, DOCX, TXT, MD'}
            accept=".pdf,.docx,.txt,.md"
            onFiles={(files) => void onFiles(files)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- new collection dialog ------------------------ */

function NewCollectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateCollection();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = async () => {
    if (!name.trim()) return;
    try {
      await create.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success('Collection created', name.trim());
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Could not create collection', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="New collection" description="Group related documents together." />
        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            {(p) => <Input {...p} placeholder="Support" value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Description">
            {(p) => (
              <Input
                {...p}
                placeholder="Customer support documents"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || !name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
