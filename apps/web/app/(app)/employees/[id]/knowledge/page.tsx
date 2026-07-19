'use client';

import Link from 'next/link';
import { BookOpen, FileText, Globe, Plus } from 'lucide-react';
import { Badge, Button, Card, CardContent, Switch } from '@aie/ui';
import { collections, documents } from '@/lib/mock/knowledge';
import { formatBytes, formatRelative } from '@/lib/format';

const typeIcon = { pdf: FileText, url: Globe, notion: BookOpen, manual: FileText };

export default function EmployeeKnowledge() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-2">
          This employee is trained on <span className="font-medium text-text">{documents.length} sources</span> across{' '}
          {collections.length} collections.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/knowledge">
            <Plus className="size-4" /> Assign knowledge
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {documents.map((doc) => {
          const Icon = typeIcon[doc.type];
          return (
            <Card key={doc.id}>
              <CardContent className="flex items-center gap-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-[13px] text-text-3">
                    {doc.collection} · {doc.chunks} chunks · {formatBytes(doc.sizeBytes)} · updated{' '}
                    {formatRelative(doc.updatedAt)}
                  </p>
                </div>
                <Badge
                  tone={doc.status === 'ready' ? 'success' : doc.status === 'failed' ? 'danger' : 'warning'}
                  dot
                  className="capitalize"
                >
                  {doc.status}
                </Badge>
                <Switch defaultChecked={doc.status === 'ready'} aria-label={`Toggle ${doc.name}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
