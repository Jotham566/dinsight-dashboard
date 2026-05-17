import { describe, expect, it } from 'vitest';
import { Actions, can } from '@/lib/permissions';

// The frontend permission table is a copy of the backend's policy.go
// matrix. These tests pin the high-leverage gates so a drift between
// the two surfaces fails CI rather than shipping silently.

describe('can()', () => {
  it('lets admin read the audit log', () => {
    expect(can('admin', Actions.AuditRead)).toBe(true);
  });

  it('forbids operator from reading the audit log', () => {
    expect(can('operator', Actions.AuditRead)).toBe(false);
  });

  it('forbids viewer from reading the audit log', () => {
    expect(can('viewer', Actions.AuditRead)).toBe(false);
  });

  it('lets operator create alert rules', () => {
    expect(can('operator', Actions.AlertRuleCreate)).toBe(true);
  });

  it('forbids viewer from creating alert rules', () => {
    expect(can('viewer', Actions.AlertRuleCreate)).toBe(false);
  });

  it('reserves destructive deletes for admin only', () => {
    expect(can('admin', Actions.AlertRuleDelete)).toBe(true);
    expect(can('operator', Actions.AlertRuleDelete)).toBe(false);
    expect(can('viewer', Actions.AlertRuleDelete)).toBe(false);
    expect(can('admin', Actions.DatasetDelete)).toBe(true);
    expect(can('operator', Actions.DatasetDelete)).toBe(false);
  });

  it('lets all three roles read datasets (viewer exists for this)', () => {
    expect(can('admin', Actions.DatasetRead)).toBe(true);
    expect(can('operator', Actions.DatasetRead)).toBe(true);
    expect(can('viewer', Actions.DatasetRead)).toBe(true);
  });

  it('fails closed on null / undefined role', () => {
    expect(can(null, Actions.DatasetRead)).toBe(false);
    expect(can(undefined, Actions.DatasetRead)).toBe(false);
  });

  it('admin capability set is a superset of operator', () => {
    // Walk every action operator can do; admin must too.
    for (const action of Object.values(Actions)) {
      if (can('operator', action)) {
        expect(can('admin', action)).toBe(true);
      }
    }
  });

  it('operator capability set is a superset of viewer', () => {
    for (const action of Object.values(Actions)) {
      if (can('viewer', action)) {
        expect(can('operator', action)).toBe(true);
      }
    }
  });

  it('reserves platform-admin actions for admin role (slug check enforced separately)', () => {
    expect(can('admin', Actions.PlatformOrgRead)).toBe(true);
    expect(can('admin', Actions.PlatformOrgCreate)).toBe(true);
    expect(can('admin', Actions.PlatformOrgDelete)).toBe(true);
    expect(can('operator', Actions.PlatformOrgRead)).toBe(false);
    expect(can('viewer', Actions.PlatformOrgRead)).toBe(false);
  });
});
