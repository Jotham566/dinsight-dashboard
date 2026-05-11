import {
  Bell,
  Home,
  Database,
  Monitor,
  ShieldAlert,
  UserCog,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';
import { Actions, type Action } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  requiresAuth?: boolean;
  requiredRoles?: Array<'admin' | 'user' | 'viewer'>;
  // Restricts the item to users with this role in the currently-active
  // organization. Kept for nav entries that gate on a role itself rather
  // than a specific action. New entries should prefer requiredAction.
  requiredOrgRoles?: Array<'admin' | 'operator' | 'viewer'>;
  // Restricts the item to users who can perform this Action in the
  // currently-active org. The action name matches the backend's policy
  // table — a grep across both codebases finds every gate. Composes
  // with requiredOrgRoles when both are set (both must allow).
  requiredAction?: Action;
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
    label: 'Alerts',
    href: '/dashboard/alerts',
    icon: Bell,
    requiresAuth: true,
    description: 'Active alerts and the rules that fire them',
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
    // Sourced from the same matrix the backend uses for middleware.
    // RequireAction(policy.ActionAuditRead), so the cosmetic gate can
    // never drift from the authoritative gate.
    requiredAction: Actions.AuditRead,
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
