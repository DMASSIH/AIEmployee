'use client';

import { Button, Switch, toast } from '@aie/ui';
import { SettingRow, SettingsSection } from '@/components/shell/settings-section';

const emailNotifs = [
  { label: 'Escalations', desc: 'When an AI employee escalates to a human.', on: true },
  { label: 'Approvals needed', desc: 'When an action is waiting for your approval.', on: true },
  { label: 'Weekly summary', desc: 'A digest of your team’s performance every Monday.', on: true },
  { label: 'Usage alerts', desc: 'When you approach a plan limit.', on: false },
  { label: 'Product updates', desc: 'New features and improvements.', on: false },
];

export default function NotificationSettings() {
  return (
    <SettingsSection
      title="Email notifications"
      description="Choose what lands in your inbox."
      footer={<Button onClick={() => toast.success('Preferences saved')}>Save changes</Button>}
    >
      {emailNotifs.map((n) => (
        <SettingRow key={n.label} label={n.label} description={n.desc}>
          <Switch defaultChecked={n.on} />
        </SettingRow>
      ))}
    </SettingsSection>
  );
}
