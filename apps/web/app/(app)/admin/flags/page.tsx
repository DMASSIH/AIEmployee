'use client';

import { Badge, Card, CardContent, Switch } from '@aie/ui';
import { featureFlags } from '@/lib/mock/admin';

export default function AdminFlagsPage() {
  return (
    <div className="flex flex-col gap-3">
      {featureFlags.map((flag) => (
        <Card key={flag.key}>
          <CardContent className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <code className="font-mono text-[13px] font-medium">{flag.key}</code>
                <Badge tone={flag.enabled ? 'success' : 'neutral'}>{flag.rollout}</Badge>
              </div>
              <p className="mt-0.5 text-[13px] text-text-2">{flag.description}</p>
            </div>
            <Switch defaultChecked={flag.enabled} aria-label={`Toggle ${flag.key}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
