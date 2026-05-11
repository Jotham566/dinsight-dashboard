import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDebouncedRemotePrefsWithConflict,
  type PrefsConflict,
  type PrefsWithMeta,
} from '@/hooks/useDebouncedRemotePrefsWithConflict';

interface LivePrefs extends PrefsWithMeta {
  selectedId: number | null;
  pointSize: number;
  draftNote: string;
}

const defaults: LivePrefs = {
  selectedId: null,
  pointSize: 4,
  draftNote: '',
};

const SCOPED_KEY = 'live-monitor-test:v1';
const USER_ID = 42;
const STORAGE_KEY = `dinsight:u${USER_ID}:${SCOPED_KEY}`;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedRemotePrefsWithConflict', () => {
  it('hydrates from localStorage immediately', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedId: 7, pointSize: 8, draftNote: 'typed' })
    );
    let resolveRemote: (v: LivePrefs | null) => void = () => {};
    const fetchRemote = vi.fn(
      () =>
        new Promise<LivePrefs | null>((resolve) => {
          resolveRemote = resolve;
        })
    );

    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote: vi.fn().mockResolvedValue(undefined),
      })
    );

    await waitFor(() => {
      expect(result.current.prefs.selectedId).toBe(7);
    });

    await act(async () => {
      resolveRemote(null);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
  });

  it('auto-applies server snapshot when not from another device', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedId: 5,
        pointSize: 4,
        draftNote: 'local',
        __meta: { deviceId: 'my-device', updatedAt: '2026-05-10T00:00:00Z', version: 1 },
      })
    );
    const fetchRemote = vi.fn().mockResolvedValue({
      selectedId: 9,
      pointSize: 12,
      draftNote: '',
      __meta: { deviceId: 'my-device', updatedAt: '2026-05-11T00:00:00Z', version: 1 },
    });
    const onConflict = vi.fn();

    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote: vi.fn().mockResolvedValue(undefined),
        onConflict,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    // Server payload won (same device, newer).
    expect(result.current.prefs.selectedId).toBe(9);
    expect(result.current.prefs.pointSize).toBe(12);
    // No conflict surfaced because the foreign-device test failed.
    expect(onConflict).not.toHaveBeenCalled();
  });

  it('surfaces a conflict when server is from another device + newer + local has edits', async () => {
    // Pretend the user typed something locally on this device first.
    // We do this by setting localStorage with our deviceId + recent
    // updatedAt, then calling setPrefs once before hydration completes
    // to mark hasLocalEdits.
    let resolveRemote: (v: LivePrefs | null) => void = () => {};
    const fetchRemote = vi.fn(
      () =>
        new Promise<LivePrefs | null>((resolve) => {
          resolveRemote = resolve;
        })
    );
    let conflictPayload: PrefsConflict<LivePrefs> | null = null;
    const onConflict = vi.fn((c: PrefsConflict<LivePrefs>) => {
      conflictPayload = c;
    });

    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote: vi.fn().mockResolvedValue(undefined),
        onConflict,
        debounceMs: 5000,
      })
    );

    // Wait for local hydration (which is immediate from empty storage).
    await waitFor(() => {
      expect(fetchRemote).toHaveBeenCalled();
    });

    // Simulate a local edit that hasn't been saved yet. This marks
    // hasLocalEditsRef so the conflict path will engage.
    act(() => {
      result.current.setPrefs({ ...defaults, draftNote: 'pre-conflict' });
    });

    // Resolve the remote fetch with a payload from ANOTHER device, newer.
    await act(async () => {
      resolveRemote({
        selectedId: 99,
        pointSize: 20,
        draftNote: 'from-other-device',
        __meta: {
          deviceId: 'OTHER-DEVICE',
          updatedAt: new Date(Date.now() + 60_000).toISOString(),
          version: 1,
        },
      });
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(conflictPayload).not.toBeNull();
    expect(conflictPayload!.server.draftNote).toBe('from-other-device');
    expect(conflictPayload!.local.draftNote).toBe('pre-conflict');

    // Local state is preserved while the modal is open.
    expect(result.current.prefs.draftNote).toBe('pre-conflict');
  });

  it('resolveConflict("merge", merged) sets the merged state and schedules a save', async () => {
    vi.useFakeTimers();
    const saveRemote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote: vi.fn().mockResolvedValue(null),
        saveRemote,
        debounceMs: 100,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.resolveConflict({
        kind: 'merge',
        merged: { selectedId: 11, pointSize: 4, draftNote: 'resolved' },
      });
    });

    expect(result.current.prefs.selectedId).toBe(11);
    expect(result.current.prefs.draftNote).toBe('resolved');

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith(
      expect.objectContaining({ selectedId: 11, draftNote: 'resolved' })
    );
  });

  it('resolveConflict("use-local") schedules a save with the current local value', async () => {
    vi.useFakeTimers();
    const saveRemote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote: vi.fn().mockResolvedValue(null),
        saveRemote,
        debounceMs: 100,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setPrefs({ ...defaults, draftNote: 'mine' });
    });
    // The setPrefs above will trigger a debounced save; flush it first
    // to put us in a "no pending writes" state.
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    saveRemote.mockClear();

    act(() => {
      result.current.resolveConflict({ kind: 'use-local' });
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith(expect.objectContaining({ draftNote: 'mine' }));
  });

  it('setPrefs stamps __meta with the device id + ISO timestamp', async () => {
    const saveRemote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote: vi.fn().mockResolvedValue(null),
        saveRemote,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    act(() => {
      result.current.setPrefs({ ...defaults, draftNote: 'stamp-me' });
    });

    expect(result.current.prefs.__meta).toBeDefined();
    expect(result.current.prefs.__meta?.deviceId).toBeTruthy();
    expect(result.current.prefs.__meta?.version).toBe(1);
    expect(() => new Date(result.current.prefs.__meta!.updatedAt).toISOString()).not.toThrow();
  });

  it('without onConflict callback, behaves like the simple remote-prefs hook (server wins)', async () => {
    const fetchRemote = vi.fn().mockResolvedValue({
      selectedId: 50,
      pointSize: 4,
      draftNote: 'server-says',
      __meta: {
        deviceId: 'OTHER-DEVICE',
        updatedAt: new Date(Date.now() + 60_000).toISOString(),
        version: 1,
      },
    });
    const { result } = renderHook(() =>
      useDebouncedRemotePrefsWithConflict<LivePrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote: vi.fn().mockResolvedValue(undefined),
        // No onConflict.
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    // Server payload applied even though it's from another device.
    expect(result.current.prefs.selectedId).toBe(50);
    expect(result.current.prefs.draftNote).toBe('server-says');
  });
});
