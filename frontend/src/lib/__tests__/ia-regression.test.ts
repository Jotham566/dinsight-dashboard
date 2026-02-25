import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mainNavItems, quickActions } from '@/lib/navigation';

const dashboardRoot = path.resolve(process.cwd(), 'src/app/dashboard');

describe('IA regression checks', () => {
  it('keeps exactly the 5 target navigation routes', () => {
    const hrefs = mainNavItems.map((item) => item.href);
    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/data',
      '/dashboard/live',
      '/dashboard/insights',
      '/dashboard/account',
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
