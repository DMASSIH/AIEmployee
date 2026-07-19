import { Badge } from '@aie/ui';
import type { Autonomy, EmployeeStatus } from '@/lib/mock/employees';

const statusTone: Record<EmployeeStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  onboarding: 'warning',
  paused: 'neutral',
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

export { autonomyLabel };
