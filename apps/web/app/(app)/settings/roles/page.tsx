'use client';

import { Check, Minus } from 'lucide-react';
import { Badge, Card, CardContent } from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { permissionKeys, roles } from '@/lib/mock/org';

export default function RolesSettings() {
  return (
    <SettingsSection title="Roles & permissions" description="What each role can do in this organization.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2.5 text-left font-medium text-text-3">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="px-3 py-2.5 text-center">
                  <span className="font-semibold capitalize">{r.name}</span>
                  <Badge tone="neutral" className="ml-1.5">
                    {r.members}
                  </Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {permissionKeys.map((perm) => (
              <tr key={perm}>
                <td className="py-3 text-text-2">{perm}</td>
                {roles.map((r) => (
                  <td key={r.id} className="px-3 py-3 text-center">
                    {r.permissions[perm] ? (
                      <Check className="mx-auto size-4 text-success" />
                    ) : (
                      <Minus className="mx-auto size-4 text-text-3" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {roles.map((r) => (
          <Card key={r.id}>
            <CardContent className="py-4">
              <p className="font-semibold capitalize">{r.name}</p>
              <p className="mt-1 text-[13px] text-text-2">{r.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SettingsSection>
  );
}
