'use client';

import { MailPlus } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { invitations } from '@/lib/mock/org';
import { formatRelative } from '@/lib/format';

export default function InvitationsSettings() {
  return (
    <SettingsSection title="Pending invitations" description="Invitations that haven't been accepted yet.">
      {invitations.length === 0 ? (
        <EmptyState icon={MailPlus} title="No pending invitations" description="Invite teammates from the Members page." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited by</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.email}</TableCell>
                <TableCell>
                  <Badge tone="neutral" className="capitalize">
                    {inv.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-2">{inv.invitedBy}</TableCell>
                <TableCell className="text-text-2">{formatRelative(inv.expiresAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toast.success('Invitation resent')}>
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toast.info('Invitation revoked')}>
                      Revoke
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SettingsSection>
  );
}
