'use client';

import { useState } from 'react';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { members } from '@/lib/mock/org';
import { formatRelative } from '@/lib/format';

const roleTone = { owner: 'accent', admin: 'info', member: 'neutral' } as const;

export default function MembersSettings() {
  const [invite, setInvite] = useState(false);

  return (
    <SettingsSection
      title="Members"
      description="People with access to this organization."
      footer={
        <Button onClick={() => setInvite(true)}>
          <UserPlus className="size-4" /> Invite member
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} />
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-[13px] text-text-3">{m.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge tone={roleTone[m.role]} className="capitalize">
                  {m.role}
                </Badge>
              </TableCell>
              <TableCell className="text-text-2">{formatRelative(m.lastActive)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Member actions" disabled={m.role === 'owner'}>
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Change role</DropdownMenuItem>
                    <DropdownMenuItem>Resend invite</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive>Remove from org</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={invite} onOpenChange={setInvite}>
        <DialogContent>
          <DialogHeader title="Invite member" description="They'll get an email to join this organization." />
          <div className="flex flex-col gap-4">
            <Field label="Email">{(p) => <Input {...p} type="email" placeholder="teammate@company.com" />}</Field>
            <Field label="Role">
              {() => (
                <Select defaultValue="member">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvite(false)}>
              Cancel
            </Button>
            <Button onClick={() => { setInvite(false); toast.success('Invitation sent'); }}>Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
