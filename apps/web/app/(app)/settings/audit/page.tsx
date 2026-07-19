'use client';

import { Avatar, Badge, SearchInput } from '@aie/ui';
import { useState } from 'react';
import { SettingsSection } from '@/components/shell/settings-section';
import { auditLog } from '@/lib/mock/org';
import { formatRelative } from '@/lib/format';

export default function AuditSettings() {
  const [query, setQuery] = useState('');
  const filtered = auditLog.filter(
    (a) =>
      a.action.toLowerCase().includes(query.toLowerCase()) ||
      a.actor.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <SettingsSection title="Audit log" description="An append-only record of every action in this organization.">
      <SearchInput
        className="max-w-xs"
        placeholder="Search actions or actors…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ol className="flex flex-col divide-y divide-border">
        {filtered.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <Avatar name={a.actor} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{a.actor}</span>{' '}
                <code className="rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-[12px] text-text-2">{a.action}</code>{' '}
                <span className="text-text-2">{a.target}</span>
              </p>
              <p className="text-[12px] text-text-3">
                {a.ip !== '—' ? `${a.ip} · ` : ''}
                {formatRelative(a.at)}
              </p>
            </div>
            {a.actor.includes('AI') && <Badge tone="accent">AI</Badge>}
          </li>
        ))}
      </ol>
    </SettingsSection>
  );
}
