import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedRemotePrefs } from '@/hooks/useDebouncedRemotePrefs';

interface Prefs {
  layout: string;
  threshold: number;
  draftNote: string;
}

const defaults: Prefs = { layout: 'grid', threshold: 0.5, draftNote: '' };

const SCOPED_KEY = 'live-monitor:test:v1';
const USER_ID = 42;
const STORAGE_KEY = `dinsight:u${USER_ID}:${SCOPED_KEY}`;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedRemotePrefs', () => {
  it('hydrates from localStorage immediately, before fetchRemote resolves', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ layout: 'list', threshold: 0.7, draftNote: 'typed offline' })
    );

    let resolveRemote: (value: Prefs | null) => void = () => {};
    const fetchRemote = vi.fn(
      () =>
        new Promise<Prefs | null>((resolve) => {
          resolveRemote = resolve;
        })
    );
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
      })
    );

    // Local hydration runs in a useEffect — wait one tick.
    await waitFor(() => {
      expect(result.current.prefs.layout).toBe('list');
    });
    expect(result.current.prefs.threshold).toBe(0.7);
    expect(result.current.prefs.draftNote).toBe('typed offline');
    // Server hydration still pending.
    expect(result.current.isHydrated).toBe(false);

    // Resolve the remote fetch with null (no server snapshot).
    await act(async () => {
      resolveRemote(null);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    // Local values preserved when server snapshot is null.
    expect(result.current.prefs.layout).toBe('list');
  });

  it('merges server payload over locally-hydrated value (default server-wins)', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ layout: 'list', threshold: 0.4, draftNote: 'typed offline' })
    );
    const fetchRemote = vi.fn().mockResolvedValue({
      layout: 'grid',
      threshold: 0.9,
      draftNote: '',
    });
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual({ layout: 'grid', threshold: 0.9, draftNote: '' });
    // Merged result is persisted locally so the next reload doesn't flash pre-merge.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      layout: 'grid',
      threshold: 0.9,
      draftNote: '',
    });
  });

  it('honors a custom merge function that keeps local-only fields', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ layout: 'list', threshold: 0.4, draftNote: 'work-in-progress' })
    );
    const fetchRemote = vi.fn().mockResolvedValue({
      layout: 'grid',
      threshold: 0.9,
      draftNote: '',
    });
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        // Keep the user's draftNote even though the server snapshot is empty.
        mergeServerWithLocal: (server, local) => ({ ...server, draftNote: local.draftNote }),
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual({
      layout: 'grid',
      threshold: 0.9,
      draftNote: 'work-in-progress',
    });
  });

  it('writes to localStorage synchronously on setPrefs', async () => {
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.3, draftNote: 'hi' });
    });

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      layout: 'list',
      threshold: 0.3,
      draftNote: 'hi',
    });
    expect(result.current.prefs.layout).toBe('list');
  });

  it('debounces remote saves: rapid edits collapse to one call with the last value', async () => {
    vi.useFakeTimers();
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        debounceMs: 500,
      })
    );

    // Flush both hydration effects under fake timers.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.isHydrated).toBe(true);

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.1, draftNote: 'a' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.2, draftNote: 'ab' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.3, draftNote: 'abc' });
    });
    // Still within the debounce window of the most recent edit.
    expect(saveRemote).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith({
      layout: 'list',
      threshold: 0.3,
      draftNote: 'abc',
    });
  });

  it('does not save to remote before both hydrations complete', async () => {
    let resolveRemote: (value: Prefs | null) => void = () => {};
    const fetchRemote = vi.fn(
      () =>
        new Promise<Prefs | null>((resolve) => {
          resolveRemote = resolve;
        })
    );
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        debounceMs: 50,
      })
    );

    // Local hydration completed; server still pending.
    await waitFor(() => {
      expect(fetchRemote).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.9, draftNote: 'pre-hydration' });
    });

    // Wait past the debounce window — no save should fire while hydration pends.
    await new Promise((r) => setTimeout(r, 120));
    expect(saveRemote).not.toHaveBeenCalled();

    // Local write still happened.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).draftNote).toBe('pre-hydration');

    // Resolve server fetch with no snapshot.
    await act(async () => {
      resolveRemote(null);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    // The pre-hydration setPrefs did NOT schedule a save. The contract says
    // a subsequent setPrefs is what arms the timer.
    expect(saveRemote).not.toHaveBeenCalled();

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.9, draftNote: 'post-hydration' });
    });
    await new Promise((r) => setTimeout(r, 120));
    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith(
      expect.objectContaining({ draftNote: 'post-hydration' })
    );
  });

  it('flushNow flushes a pending debounced write immediately', async () => {
    vi.useFakeTimers();
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        debounceMs: 10_000,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.1, draftNote: 'flush-me' });
    });
    expect(saveRemote).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flushNow();
    });

    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith({
      layout: 'list',
      threshold: 0.1,
      draftNote: 'flush-me',
    });

    // Subsequent flush is a no-op (nothing dirty).
    await act(async () => {
      await result.current.flushNow();
    });
    expect(saveRemote).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending write on unmount', async () => {
    vi.useFakeTimers();
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result, unmount } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        debounceMs: 10_000,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.1, draftNote: 'about to navigate' });
    });
    expect(saveRemote).not.toHaveBeenCalled();

    // Unmount fires the cleanup which calls flushNow.
    await act(async () => {
      unmount();
      await Promise.resolve();
    });

    expect(saveRemote).toHaveBeenCalledTimes(1);
    expect(saveRemote).toHaveBeenLastCalledWith(
      expect.objectContaining({ draftNote: 'about to navigate' })
    );
  });

  it('survives corrupt JSON in localStorage (sticks with initial)', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual(defaults);
  });

  it('marks dirty again when saveRemote rejects so the next flush retries', async () => {
    vi.useFakeTimers();
    const fetchRemote = vi.fn().mockResolvedValue(null);
    const saveRemote = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useDebouncedRemotePrefs<Prefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        fetchRemote,
        saveRemote,
        debounceMs: 100,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setPrefs({ layout: 'list', threshold: 0.1, draftNote: 'retry-me' });
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      // Let the rejected promise settle.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveRemote).toHaveBeenCalledTimes(1);

    // First save rejected → dirty re-armed. flushNow should retry.
    await act(async () => {
      await result.current.flushNow();
    });

    expect(saveRemote).toHaveBeenCalledTimes(2);
    expect(saveRemote).toHaveBeenLastCalledWith(expect.objectContaining({ draftNote: 'retry-me' }));
  });
});
