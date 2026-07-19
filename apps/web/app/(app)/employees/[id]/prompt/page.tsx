'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { GitBranch, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from '@aie/ui';
import { employeeById, sampleSystemPrompt } from '@/lib/mock/employees';

export default function PromptEditor() {
  const { id } = useParams<{ id: string }>();
  const e = employeeById(id);
  const [value, setValue] = useState(sampleSystemPrompt);
  const dirty = value !== sampleSystemPrompt;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>System prompt</CardTitle>
            <Badge tone="neutral">
              <GitBranch className="size-3" /> v{e?.promptVersion}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={!dirty} onClick={() => setValue(sampleSystemPrompt)}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button
              size="sm"
              disabled={!dirty}
              onClick={() => toast.success('Prompt saved as v' + ((e?.promptVersion ?? 0) + 1))}
            >
              <Save className="size-4" /> Save version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            spellCheck={false}
            className="min-h-[420px] w-full resize-y rounded-md border border-border bg-surface p-4 font-mono text-[13px] leading-relaxed text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-accent-soft text-accent">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm font-medium">Compiled from the job description</p>
            <p className="text-[13px] leading-relaxed text-text-2">
              This prompt was generated from {e?.name}&apos;s job description. Edit directly, or update the
              description to recompile.
            </p>
            <Button variant="outline" size="sm">
              <Sparkles className="size-4" /> Recompile from JD
            </Button>
          </CardContent>
        </Card>
        {dirty && (
          <Alert tone="warning" title="Unsaved changes">
            Saving creates a new version. The active version stays live until you activate the new one.
          </Alert>
        )}
      </div>
    </div>
  );
}
