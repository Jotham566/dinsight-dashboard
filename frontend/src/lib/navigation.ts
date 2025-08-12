import {
  Home,
  BarChart3,
  LineChart,
  Microscope,
  Dna,
  Settings,
  Bell,
  Upload,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  requiresAuth?: boolean;
  requiredRoles?: Array<'admin' | 'user' | 'viewer'>;
  description?: string;
}

export const mainNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    requiresAuth: true,
    description: 'Overview of your predictive maintenance analytics',
  },
  {
    label: 'Data Summary',
    href: '/dashboard/data-summary',
    icon: Upload,
    requiresAuth: true,
    description: 'Upload and manage your CSV data files',
  },
  {
    label: 'Visualization',
    href: '/dashboard/visualization',
    icon: LineChart,
    requiresAuth: true,
    description: 'Interactive plots and data visualization',
  },
  {
    label: 'Analysis',
    href: '/dashboard/analysis',
    icon: Microscope,
    requiresAuth: true,
    description: 'Advanced anomaly detection and analysis',
  },
  {
    label: 'Features',
    href: '/dashboard/features',
    icon: Dna,
    requiresAuth: true,
    description: 'Raw feature data exploration and visualization',
  },
];

export const bottomNavItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    requiresAuth: true,
    description: 'User preferences and account settings',
  },
];

export const userMenuItems = [
  { label: 'Profile', href: '/dashboard/profile' },
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Change Password', href: '/dashboard/change-password' },
];

export const quickActions = [
  { label: 'Upload Data', href: '/dashboard/data-summary', icon: Upload },
  { label: 'New Analysis', href: '/dashboard/analysis', icon: Microscope },
  { label: 'View Alerts', href: '/dashboard/alerts', icon: Bell },
];
