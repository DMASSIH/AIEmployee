'use client';

import { Globe, Mail, MessageCircle, Webhook } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@aie/ui';
import { deployChannels } from '@/lib/mock/employees';

const icons: Record<string, typeof Mail> = {
  ch_email: Mail,
  ch_widget: Globe,
  ch_whatsapp: MessageCircle,
  ch_api: Webhook,
};

const statusTone = { live: 'success', paused: 'warning', not_configured: 'neutral' } as const;
const statusLabel = { live: 'Live', paused: 'Paused', not_configured: 'Not configured' };

export default function EmployeeDeployment() {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-text-2">Choose where this employee works. Each channel can be enabled independently.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {deployChannels.map((ch) => {
          const Icon = icons[ch.id] ?? Globe;
          return (
            <Card key={ch.id}>
              <CardContent className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{ch.name}</p>
                    <Badge tone={statusTone[ch.status]} dot>
                      {statusLabel[ch.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[13px] text-text-2">{ch.detail}</p>
                </div>
                {ch.status === 'not_configured' ? (
                  <Button variant="outline" size="sm">Connect</Button>
                ) : (
                  <Switch defaultChecked={ch.status === 'live'} aria-label={`Toggle ${ch.name}`} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Embed the web widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-text-2">Drop this snippet before your closing &lt;/body&gt; tag.</p>
          <pre className="overflow-x-auto rounded-md bg-ink p-4 font-mono text-[13px] text-ink-text/80">
            {`<script src="https://cdn.aiemployee.com/widget.js"
  data-employee="emp_maya" async></script>`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
