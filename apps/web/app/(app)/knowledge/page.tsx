'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  Plus,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  Drawer,
  EmptyState,
  FileUpload,
  Progress,
  SearchInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  cn,
} from '@aie/ui';
import { PageHeader } from '@/components/shell/page-header';
import { collections, documents, processingQueue, sampleChunks, type MockDocument } from '@/lib/mock/knowledge';
import { formatBytes, formatNumber, formatRelative } from '@/lib/format';

const typeIcon = { pdf: FileText, url: Globe, notion: BookOpen, manual: FileText };
const statusTone = { ready: 'success', processing: 'warning', failed: 'danger', pending: 'neutral' } as const;

export default function KnowledgePage() {
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MockDocument | null>(null);

  const filtered = useMemo(
    () => documents.filter((d) => d.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

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

      {processingQueue.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-accent" />
              <p className="text-sm font-medium">Processing {processingQueue.length} sources</p>
            </div>
            {processingQueue.map((q) => (
              <div key={q.id}>
                <div className="mb-1 flex items-center justify-between text-[13px]">
                  <span className="text-text-2">{q.name}</span>
                  <span className="capitalize text-text-3">{q.stage} · {q.progress}%</span>
                </div>
                <Progress value={q.progress} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
          {filtered.length === 0 ? (
            <EmptyState icon={BookOpen} title="No documents" description="Upload a PDF, connect a URL, or sync from Notion." action={{ label: 'Upload', onClick: () => setUploadOpen(true) }} />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((doc) => {
                const Icon = typeIcon[doc.type];
                return (
                  <Card key={doc.id}>
                    <CardContent className="flex items-center gap-4 py-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                        <Icon className="size-4.5" />
                      </span>
                      <button className="min-w-0 flex-1 text-left" onClick={() => setPreview(doc)}>
                        <p className="truncate text-sm font-medium hover:text-accent">{doc.name}</p>
                        <p className="text-[13px] text-text-3">
                          {doc.collection} · {formatNumber(doc.chunks)} chunks · {formatBytes(doc.sizeBytes)}
                        </p>
                      </button>
                      <span className="hidden text-[13px] text-text-3 sm:block">{formatRelative(doc.updatedAt)}</span>
                      <Badge tone={statusTone[doc.status]} dot className="capitalize">
                        {doc.status}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <Card key={col.id} className="transition-all hover:-translate-y-0.5 hover:shadow-pop">
                <CardContent className="flex flex-col gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <FolderOpen className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{col.name}</h3>
                    <p className="text-[13px] text-text-3">
                      {col.documents} documents · {formatBytes(col.sizeBytes)}
                    </p>
                  </div>
                  <p className="text-[13px] text-text-2">
                    Used by {col.employees.join(', ') || 'no employees yet'}
                  </p>
                </CardContent>
              </Card>
            ))}
            <button
              onClick={() => toast.info('New collection', 'Collection creation is a UI preview.')}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-text-3 transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">New collection</span>
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader title="Upload knowledge" description="PDFs, docs, or plain text up to 20 MB each." />
          <FileUpload
            hint="PDF, DOCX, TXT, MD · up to 20 MB"
            onFiles={(files) => {
              toast.success(`${files.length} file(s) queued`, 'Processing starts automatically.');
              setUploadOpen(false);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chunk viewer / preview drawer */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        {preview && (
          <Drawer title={preview.name} description={`${formatNumber(preview.chunks)} chunks · ${preview.collection}`}>
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-medium text-text-3">Chunk preview</p>
              {sampleChunks.map((chunk) => (
                <div key={chunk.id} className={cn('rounded-md border border-border bg-surface-2/40 p-3')}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12px] font-medium text-accent">#{chunk.index}</span>
                    <span className="text-[12px] text-text-3">{chunk.tokens} tokens</span>
                  </div>
                  <p className="text-[12px] font-medium text-text-2">{chunk.heading}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-text">{chunk.content}</p>
                </div>
              ))}
            </div>
          </Drawer>
        )}
      </Dialog>
    </div>
  );
}
