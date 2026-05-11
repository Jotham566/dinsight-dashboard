import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mainNavItems, quickActions } from '@/lib/navigation';

const dashboardRoot = path.resolve(process.cwd(), 'src/app/dashboard');

describe('IA regression checks', () => {
  // Operator IA + the alerts page (org-wide read, role-gated writes)
  // + /dashboard/audit (org-admin-only; hidden by the sidebar's
  // requiredAction gate, surfaced here so deep links work for the
  // admins who can see it).
  it('keeps the operator IA plus alerts plus the org-admin audit route', () => {
    const hrefs = mainNavItems.map((item) => item.href);
    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/data',
      '/dashboard/live',
      '/dashboard/insights',
      '/dashboard/alerts',
      '/dashboard/account',
      '/dashboard/audit',
    ]);
  });

  it('ensures legacy dashboard routes are removed from codebase', () => {
    const removed = [
      'analysis',
      'deterioration-analysis',
      'dinsight-analysis',
      'features',
      'profile',
      'settings',
      'streaming',
      'visualization',
    ];
    removed.forEach((segment) => {
      expect(fs.existsSync(path.join(dashboardRoot, segment))).toBe(false);
    });
  });

  it('keeps quick actions within operator IA', () => {
    const hrefs = quickActions.map((action) => action.href);
    expect(hrefs).toEqual(['/dashboard/data', '/dashboard/live', '/dashboard/insights']);
  });
});
