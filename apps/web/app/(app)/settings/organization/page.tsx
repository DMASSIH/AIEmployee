'use client';

import { Avatar, Button, Field, Input, Skeleton, toast } from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';
import { useCurrentOrg } from '@/hooks/use-orgs';

export default function OrganizationSettings() {
  const { data: org, isLoading } = useCurrentOrg();

  return (
    <div>
      <SettingsSection
        title="Organization"
        description="General settings for your active workspace."
        footer={<Button onClick={() => toast.success('Organization updated')}>Save changes</Button>}
      >
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : org ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar name={org.name} size="xl" />
              <Button variant="outline" size="sm">
                Change logo
              </Button>
            </div>
            <Field label="Name">{(p) => <Input {...p} defaultValue={org.name} />}</Field>
            <Field label="URL slug" hint="Used in links and API references.">
              {(p) => <Input {...p} defaultValue={org.slug} />}
            </Field>
            <Field label="Plan">
              {(p) => <Input {...p} defaultValue={`${org.plan[0]!.toUpperCase()}${org.plan.slice(1)}`} readOnly />}
            </Field>
          </>
        ) : (
          <p className="text-sm text-text-2">No active organization selected.</p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Danger zone"
        description="Irreversible actions for this organization."
        footer={
          <Button variant="danger" onClick={() => toast.warning('Delete organization', 'This is a UI preview.')}>
            Delete organization
          </Button>
        }
      >
        <p className="text-sm text-text-2">
          Deleting this organization permanently removes all employees, knowledge, and conversations.
        </p>
      </SettingsSection>
    </div>
  );
}
