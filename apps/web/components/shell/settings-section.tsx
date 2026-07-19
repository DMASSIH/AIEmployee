import type { ReactNode } from 'react';
import { Card, CardContent } from '@aie/ui';

/** Titled settings section card used across every settings page. */
export function SettingsSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="mb-6">
      <CardContent className="flex flex-col gap-5">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
        </div>
        {children}
      </CardContent>
      {footer && (
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3.5">{footer}</div>
      )}
    </Card>
  );
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border py-4 first:border-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="mt-0.5 text-[13px] text-text-2">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
