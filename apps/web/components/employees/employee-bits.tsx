import { Badge } from '@aie/ui';
import type { Autonomy, EmployeeStatus, EmployeeVisibility } from '@aie/core';

const statusTone: Record<EmployeeStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  onboarding: 'warning',
  paused: 'neutral',
  archived: 'neutral',
};

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <Badge tone={statusTone[status]} dot className="capitalize">
      {status}
    </Badge>
  );
}

const autonomyLabel: Record<Autonomy, string> = {
  draft_only: 'Draft only',
  approve_first: 'Approve first',
  autonomous: 'Autonomous',
};

const autonomyTone: Record<Autonomy, 'neutral' | 'info' | 'accent'> = {
  draft_only: 'neutral',
  approve_first: 'info',
  autonomous: 'accent',
};

export function AutonomyBadge({ autonomy }: { autonomy: Autonomy }) {
  return <Badge tone={autonomyTone[autonomy]}>{autonomyLabel[autonomy]}</Badge>;
}

export function VisibilityBadge({ visibility }: { visibility: EmployeeVisibility }) {
  return (
    <Badge tone={visibility === 'published' ? 'success' : 'neutral'} className="capitalize">
      {visibility}
    </Badge>
  );
}

export { autonomyLabel };
