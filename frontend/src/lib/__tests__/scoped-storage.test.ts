import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildScopedKey, readScoped, removeScoped, writeScoped } from '@/lib/scoped-storage';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('scoped-storage', () => {
  it('namespaces keys by user id', () => {
    writeScoped('live-monitor:prefs:v1', 123, 'alice-data');
    writeScoped('live-monitor:prefs:v1', 456, 'bob-data');

    expect(readScoped('live-monitor:prefs:v1', 123)).toBe('alice-data');
    expect(readScoped('live-monitor:prefs:v1', 456)).toBe('bob-data');

    // Each user reads back their own value, neither leaks across.
    expect(window.localStorage.getItem('dinsight:u123:live-monitor:prefs:v1')).toBe('alice-data');
    expect(window.localStorage.getItem('dinsight:u456:live-monitor:prefs:v1')).toBe('bob-data');
  });

  it("falls back to 'guest' when user id is null or undefined", () => {
    writeScoped('insights:wear-config-v1', null, 'pre-login');
    writeScoped('insights:wear-config-v1', undefined, 'still-pre-login');

    expect(readScoped('insights:wear-config-v1', null)).toBe('still-pre-login');
    expect(readScoped('insights:wear-config-v1', undefined)).toBe('still-pre-login');
    expect(window.localStorage.getItem('dinsight:uguest:insights:wear-config-v1')).toBe(
      'still-pre-login'
    );
  });

  it('returns null when the scoped key has not been written', () => {
    expect(readScoped('never-written', 999)).toBeNull();
  });

  it('removeScoped clears only the scoped key, not the bare suffix', () => {
    writeScoped('alerts:dismissed', 123, '["alert-1"]');
    // Set a sibling key under a different user — must not be affected.
    writeScoped('alerts:dismissed', 456, '["alert-2"]');

    removeScoped('alerts:dismissed', 123);

    expect(readScoped('alerts:dismissed', 123)).toBeNull();
    expect(readScoped('alerts:dismissed', 456)).toBe('["alert-2"]');
  });

  it('buildScopedKey exposes the qualified key for storage-event listeners', () => {
    // Storage events surface the fully-qualified key in event.key — listeners
    // need this builder to compare against the scoped form, not the bare suffix.
    expect(buildScopedKey('live-monitor:prefs:v1', 42)).toBe('dinsight:u42:live-monitor:prefs:v1');
    expect(buildScopedKey('live-monitor:prefs:v1', 'abc')).toBe(
      'dinsight:uabc:live-monitor:prefs:v1'
    );
    expect(buildScopedKey('live-monitor:prefs:v1', null)).toBe(
      'dinsight:uguest:live-monitor:prefs:v1'
    );
  });
});
