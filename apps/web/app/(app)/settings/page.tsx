'use client';

import { Avatar, Button, Field, Input, toast } from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileSettings() {
  const { user } = useAuth();

  return (
    <div>
      <SettingsSection
        title="Profile"
        description="This information is visible to your team members."
        footer={<Button onClick={() => toast.success('Profile saved')}>Save changes</Button>}
      >
        <div className="flex items-center gap-4">
          <Avatar name={user?.displayName ?? 'User'} size="xl" />
          <div>
            <Button variant="outline" size="sm">
              Change avatar
            </Button>
            <p className="mt-1.5 text-[12px] text-text-3">JPG, PNG or GIF. Max 2 MB.</p>
          </div>
        </div>
        <Field label="Display name">
          {(p) => <Input {...p} defaultValue={user?.displayName ?? ''} />}
        </Field>
        <Field label="Email" hint="Your email is used for sign-in and notifications.">
          {(p) => <Input {...p} type="email" defaultValue={user?.email ?? ''} readOnly />}
        </Field>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently remove your account and all associated data. This cannot be undone."
        footer={
          <Button variant="danger" onClick={() => toast.warning('Account deletion', 'This is a UI preview.')}>
            Delete account
          </Button>
        }
      >
        <p className="text-sm text-text-2">
          Deleting your account removes you from all organizations. Organizations you own must be
          transferred or deleted first.
        </p>
      </SettingsSection>
    </div>
  );
}
