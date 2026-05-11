import {
  Home,
  Database,
  Monitor,
  ShieldAlert,
  UserCog,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  requiresAuth?: boolean;
  requiredRoles?: Array<'admin' | 'user' | 'viewer'>;
  // Restricts the item to users with this role in the currently-active
  // organization. Read by the sidebar to hide org-admin-only entries
  // (audit log, soon: org settings, invites) from operators/viewers.
  requiredOrgRoles?: Array<'admin' | 'operator' | 'viewer'>;
  description?: string;
}

export const mainNavItems: NavItem[] = [
  {
    label: 'Machine Status',
    href: '/dashboard',
    icon: Home,
    requiresAuth: true,
    description: 'Current machine condition and next actions',
  },
  {
    label: 'Data Ingestion',
    href: '/dashboard/data',
    icon: Database,
    requiresAuth: true,
    description: 'Upload baseline and monitoring datasets',
  },
  {
    label: 'Live Monitor',
    href: '/dashboard/live',
    icon: Monitor,
    requiresAuth: true,
    description: 'Observe live and near-real-time machine behavior',
  },
  {
    label: 'Health Insights',
    href: '/dashboard/insights',
    icon: ShieldAlert,
    requiresAuth: true,
    description: 'Anomaly and wear trend interpretation',
  },
  {
    label: 'Account & Security',
    href: '/dashboard/account',
    icon: UserCog,
    requiresAuth: true,
    description: 'Profile, password, sessions, and preferences',
  },
  {
    label: 'Audit Log',
    href: '/dashboard/audit',
    icon: ScrollText,
    requiresAuth: true,
    requiredOrgRoles: ['admin'],
    description: 'Who changed what in this organization',
  },
];

export const bottomNavItems: NavItem[] = [];

export const userMenuItems = [{ label: 'Account & Security', href: '/dashboard/account' }];

export const quickActions = [
  { label: 'Upload Data', href: '/dashboard/data', icon: Database },
  { label: 'Open Live Monitor', href: '/dashboard/live', icon: Monitor },
  { label: 'View Insights', href: '/dashboard/insights', icon: ShieldAlert },
];
