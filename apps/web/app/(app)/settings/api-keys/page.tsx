'use client';

import { useState } from 'react';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  EmptyState,
  Field,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { apiKeys } from '@/lib/mock/org';
import { formatDate, formatRelative } from '@/lib/format';

export default function ApiKeysSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  return (
    <SettingsSection
      title="API keys"
      description="Authenticate server-to-server requests to the AI Employee API."
      footer={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Create key
        </Button>
      }
    >
      {apiKeys.length === 0 ? (
        <EmptyState icon={KeyRound} title="No API keys" description="Create a key to start using the API." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.name}</TableCell>
                <TableCell>
                  <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[12px]">{k.prefix}…</code>
                </TableCell>
                <TableCell className="text-text-2">
                  {k.lastUsedAt ? formatRelative(k.lastUsedAt) : 'Never'}
                </TableCell>
                <TableCell className="text-text-2">{formatDate(k.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" aria-label="Revoke" onClick={() => setRevokeId(k.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader title="Create API key" description="Give it a memorable name. You'll see the secret once." />
          <Field label="Key name">{(p) => <Input {...p} placeholder="Production backend" />}</Field>
          <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface-2/50 p-3">
            <code className="flex-1 truncate font-mono text-[13px]">aie_live_3f9x••••••••••••••••</code>
            <Button variant="ghost" size="icon-sm" aria-label="Copy" onClick={() => toast.success('Copied to clipboard')}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setCreateOpen(false); toast.success('API key created'); }}>Create key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeId}
        onOpenChange={(v) => !v && setRevokeId(null)}
        title="Revoke API key?"
        description="Any integration using this key will immediately stop working. This cannot be undone."
        confirmLabel="Revoke key"
        tone="danger"
        onConfirm={() => toast.success('API key revoked')}
      />
    </SettingsSection>
  );
}
