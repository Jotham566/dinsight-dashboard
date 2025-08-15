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
    label: 'Run Dinsight Analysis',
    href: '/dashboard/dinsight-analysis',
    icon: Upload,
    requiresAuth: true,
    description: 'Upload data and run Dinsight analysis with custom settings',
  },
  {
    label: 'Data Comparison',
    href: '/dashboard/visualization',
    icon: LineChart,
    requiresAuth: true,
    description: 'Interactive comparison between datasets',
  },
  {
    label: 'Anomaly Detection',
    href: '/dashboard/analysis',
    icon: Microscope,
    requiresAuth: true,
    description: 'Detect anomalies between baseline and monitoring data',
  },
  {
    label: 'Feature Explorer',
    href: '/dashboard/features',
    icon: Dna,
    requiresAuth: true,
    description: 'Explore raw feature data with heatmap visualization',
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
  { label: 'Upload Data', href: '/dashboard/dinsight-analysis', icon: Upload },
  { label: 'Detect Anomalies', href: '/dashboard/analysis', icon: Microscope },
  { label: 'View Alerts', href: '/dashboard/alerts', icon: Bell },
];
