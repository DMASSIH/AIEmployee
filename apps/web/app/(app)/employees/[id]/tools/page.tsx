'use client';

import { Wrench } from 'lucide-react';
import { Badge, Card, CardContent, Switch } from '@aie/ui';
import { employeeTools } from '@/lib/mock/employees';

export default function EmployeeTools() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-text-2">
        Tools give your employee abilities beyond conversation. Approval-gated tools always pause for a human.
      </p>
      <div className="flex flex-col gap-3">
        {employeeTools.map((tool) => (
          <Card key={tool.id}>
            <CardContent className="flex items-center gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-text-2">
                <Wrench className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{tool.name}</p>
                  {tool.requiresApproval && <Badge tone="warning">Approval required</Badge>}
                </div>
                <p className="text-[13px] text-text-2">{tool.description}</p>
              </div>
              <Switch defaultChecked={tool.enabled} aria-label={`Toggle ${tool.name}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
