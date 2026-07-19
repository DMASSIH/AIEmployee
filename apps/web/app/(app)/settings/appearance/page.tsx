'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@aie/ui';
import { SettingsSection } from '@/components/shell/settings-section';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SettingsSection title="Theme" description="Choose how AI Employee looks to you. System follows your device.">
      <div className="grid gap-4 sm:grid-cols-3">
        {options.map((opt) => {
          const active = mounted && theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex flex-col items-center gap-3 rounded-lg border p-5 transition-all',
                active ? 'border-accent ring-2 ring-accent/20' : 'border-border hover:border-border-strong',
              )}
            >
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-full',
                  active ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-text-2',
                )}
              >
                <opt.icon className="size-5" />
              </span>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}
