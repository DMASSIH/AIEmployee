'use client';

import { Laptop, Smartphone } from 'lucide-react';
import { Badge, Button, Field, Input, Switch, toast } from '@aie/ui';
import { SettingRow, SettingsSection } from '@/components/shell/settings-section';

const sessions = [
  { id: 's1', device: 'MacBook Pro · Chrome', location: 'Stockholm, SE', current: true, icon: Laptop, last: 'Active now' },
  { id: 's2', device: 'iPhone 15 · Safari', location: 'Stockholm, SE', current: false, icon: Smartphone, last: '2 hours ago' },
];

export default function SecuritySettings() {
  return (
    <div>
      <SettingsSection
        title="Password"
        description="Use a long, unique password. We hash everything with Argon2id."
        footer={<Button onClick={() => toast.success('Password updated')}>Update password</Button>}
      >
        <Field label="Current password">{(p) => <Input {...p} type="password" />}</Field>
        <Field label="New password" hint="At least 10 characters.">
          {(p) => <Input {...p} type="password" />}
        </Field>
      </SettingsSection>

      <SettingsSection title="Two-factor authentication" description="Add an extra layer of security to your account.">
        <SettingRow label="Authenticator app" description="Use a TOTP app like 1Password or Authy.">
          <Switch />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Active sessions" description="Devices currently signed in to your account.">
        {sessions.map((s) => (
          <SettingRow key={s.id} label={s.device} description={`${s.location} · ${s.last}`}>
            {s.current ? (
              <Badge tone="success" dot>
                This device
              </Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => toast.info('Session revoked')}>
                Revoke
              </Button>
            )}
          </SettingRow>
        ))}
      </SettingsSection>
    </div>
  );
}
