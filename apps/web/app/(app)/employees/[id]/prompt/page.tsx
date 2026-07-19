'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GitBranch, RotateCcw, Save, Sparkles } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from '@aie/ui';
import { CREATIVITY_PRESETS, EmployeeModel, type EmployeeModel as Model } from '@aie/core';
import {
  useCreatePromptVersion,
  useEmployee,
  useRecompilePrompt,
  useUpdateEmployee,
} from '@/hooks/use-employees';
import { ApiError } from '@/lib/api';

export default function PromptEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: e, isLoading } = useEmployee(id);
  const createVersion = useCreatePromptVersion(id);
  const recompile = useRecompilePrompt(id);
  const update = useUpdateEmployee(id);

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<Model>('claude-sonnet-5');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [welcome, setWelcome] = useState('');

  // Sync local editor state whenever the server copy changes (load / recompile).
  useEffect(() => {
    if (!e) return;
    setPrompt(e.systemPrompt ?? '');
    setModel(e.model);
    setTemperature(e.temperature);
    setMaxTokens(e.maxTokens);
    setWelcome(e.welcomeMessage ?? '');
  }, [e]);

  if (isLoading || !e) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Skeleton className="h-[480px] rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const promptDirty = prompt !== (e.systemPrompt ?? '');
  const configDirty =
    model !== e.model ||
    temperature !== e.temperature ||
    maxTokens !== e.maxTokens ||
    welcome !== (e.welcomeMessage ?? '');

  const saveVersion = async () => {
    try {
      const v = await createVersion.mutateAsync({ systemPrompt: prompt, activate: true });
      toast.success(`Saved as v${v.version}`, 'The new prompt version is now active.');
    } catch (err) {
      toast.error('Save failed', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  const onRecompile = async () => {
    try {
      const v = await recompile.mutateAsync();
      toast.success(`Recompiled as v${v.version}`, 'Prompt regenerated from the job description.');
    } catch {
      toast.error('Recompile failed', 'Please try again.');
    }
  };

  const saveConfig = async () => {
    try {
      await update.mutateAsync({
        model,
        temperature,
        maxTokens,
        welcomeMessage: welcome.trim() ? welcome.trim() : null,
      });
      toast.success('Configuration saved');
    } catch (err) {
      toast.error('Save failed', err instanceof ApiError ? err.message : 'Please try again.');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>System prompt</CardTitle>
            {e.promptVersion && (
              <Badge tone="neutral">
                <GitBranch className="size-3" /> v{e.promptVersion}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={!promptDirty}
              onClick={() => setPrompt(e.systemPrompt ?? '')}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button size="sm" disabled={!promptDirty || createVersion.isPending} onClick={saveVersion}>
              <Save className="size-4" /> Save version
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={prompt}
            onChange={(ev) => setPrompt(ev.target.value)}
            spellCheck={false}
            aria-label="System prompt"
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
              Recompiling regenerates the prompt from {e.name}&apos;s job description and saves it as a new
              active version.
            </p>
            <Button variant="outline" size="sm" onClick={onRecompile} disabled={recompile.isPending}>
              <Sparkles className="size-4" /> Recompile from JD
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Model">
              {(p) => (
                <Select value={model} onValueChange={(v) => setModel(v as Model)}>
                  <SelectTrigger id={p.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EmployeeModel.options.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field label={`Temperature — ${temperature.toFixed(2)}`}>
              {(p) => (
                <input
                  {...p}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={(ev) => setTemperature(Number(ev.target.value))}
                  className="w-full accent-accent"
                />
              )}
            </Field>
            <div className="flex gap-2">
              {(Object.keys(CREATIVITY_PRESETS) as (keyof typeof CREATIVITY_PRESETS)[]).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  className="flex-1 capitalize"
                  onClick={() => setTemperature(CREATIVITY_PRESETS[preset])}
                >
                  {preset}
                </Button>
              ))}
            </div>

            <Field label="Max tokens">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={256}
                  max={8192}
                  value={maxTokens}
                  onChange={(ev) => setMaxTokens(Number(ev.target.value))}
                />
              )}
            </Field>

            <Field label="Welcome message" hint="Shown to users at the start of a conversation.">
              {(p) => (
                <Textarea
                  {...p}
                  rows={3}
                  value={welcome}
                  onChange={(ev) => setWelcome(ev.target.value)}
                  placeholder="Hi! How can I help you today?"
                />
              )}
            </Field>

            <Button size="sm" disabled={!configDirty || update.isPending} onClick={saveConfig}>
              <Save className="size-4" /> Save configuration
            </Button>
          </CardContent>
        </Card>

        {promptDirty && (
          <Alert tone="warning" title="Unsaved changes">
            Saving creates a new active version. The current version stays live until you save.
          </Alert>
        )}
      </div>
    </div>
  );
}
