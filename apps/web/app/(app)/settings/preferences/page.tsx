'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@aie/ui';
import { SettingRow, SettingsSection } from '@/components/shell/settings-section';

export default function PreferencesSettings() {
  return (
    <SettingsSection title="Preferences" description="Personalize your workspace experience.">
      <SettingRow label="Language" description="The language used across the interface.">
        <Select defaultValue="en">
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="sv">Svenska</SelectItem>
            <SelectItem value="de">Deutsch</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Timezone" description="Used for scheduling and timestamps.">
        <Select defaultValue="cet">
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cet">Europe/Stockholm</SelectItem>
            <SelectItem value="utc">UTC</SelectItem>
            <SelectItem value="est">America/New_York</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>
      <SettingRow label="Compact mode" description="Reduce spacing to fit more on screen.">
        <Switch />
      </SettingRow>
      <SettingRow label="Keyboard shortcuts" description="Enable ⌘K and single-key navigation.">
        <Switch defaultChecked />
      </SettingRow>
    </SettingsSection>
  );
}
