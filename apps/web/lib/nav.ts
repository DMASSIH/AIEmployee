import {
  BarChart3,
  BookOpen,
  Bot,
  Building2,
  CreditCard,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  ShieldHalf,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/employees', label: 'AI Employees', icon: Bot },
  { href: '/conversations', label: 'Conversations', icon: MessagesSquare },
  { href: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export const workspaceNav: NavItem[] = [
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/admin', label: 'Admin', icon: ShieldHalf },
];

export const settingsNav = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/appearance', label: 'Appearance' },
  { href: '/settings/preferences', label: 'Preferences' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/security', label: 'Security' },
  { href: '/settings/api-keys', label: 'API keys' },
  { href: '/settings/organization', label: 'Organization' },
  { href: '/settings/members', label: 'Members' },
  { href: '/settings/invitations', label: 'Invitations' },
  { href: '/settings/roles', label: 'Roles & permissions' },
  { href: '/settings/audit', label: 'Audit log' },
];

export const adminNav = [
  { href: '/admin', label: 'System health' },
  { href: '/admin/monitoring', label: 'Monitoring' },
  { href: '/admin/logs', label: 'Logs' },
  { href: '/admin/queues', label: 'Queues' },
  { href: '/admin/workers', label: 'Workers' },
  { href: '/admin/storage', label: 'Storage' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/flags', label: 'Feature flags' },
];
