import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedLocalPrefs } from '@/hooks/useDebouncedLocalPrefs';

interface UIPrefs {
  includeMonitoring: boolean;
  activePlotTab: 'distance' | 'transitions';
  isControlsCollapsed: boolean;
}

const defaults: UIPrefs = {
  includeMonitoring: false,
  activePlotTab: 'distance',
  isControlsCollapsed: false,
};

const SCOPED_KEY = 'insights-ui-test:v1';
const USER_ID = 42;
const STORAGE_KEY = `dinsight:u${USER_ID}:${SCOPED_KEY}`;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedLocalPrefs', () => {
  it('hydrates from localStorage on mount', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        includeMonitoring: true,
        activePlotTab: 'transitions',
        isControlsCollapsed: true,
      })
    );

    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual({
      includeMonitoring: true,
      activePlotTab: 'transitions',
      isControlsCollapsed: true,
    });
  });

  it('uses initial when localStorage is empty', async () => {
    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual(defaults);
  });

  it('survives corrupt JSON in localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');

    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
      })
    );

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    expect(result.current.prefs).toEqual(defaults);
  });

  it('debounces writes: rapid setPrefs collapses to one localStorage write', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        debounceMs: 200,
      })
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setPrefs({ ...defaults, includeMonitoring: true });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // No write yet.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    act(() => {
      result.current.setPrefs({ ...defaults, includeMonitoring: true, isControlsCollapsed: true });
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual({
      includeMonitoring: true,
      activePlotTab: 'distance',
      isControlsCollapsed: true,
    });
  });

  it('state updates synchronously even while the write is pending', () => {
    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        debounceMs: 10_000,
      })
    );

    act(() => {
      result.current.setPrefs({ ...defaults, includeMonitoring: true });
    });

    // Reactive value updates immediately.
    expect(result.current.prefs.includeMonitoring).toBe(true);
    // localStorage write is still pending behind the 10s timer.
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('flushNow writes the pending value immediately', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        debounceMs: 10_000,
      })
    );

    act(() => {
      result.current.setPrefs({ ...defaults, activePlotTab: 'transitions' });
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    act(() => {
      result.current.flushNow();
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.activePlotTab).toBe('transitions');
  });

  it('flushes pending write on unmount', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: USER_ID,
        initial: defaults,
        debounceMs: 10_000,
      })
    );

    act(() => {
      result.current.setPrefs({ ...defaults, isControlsCollapsed: true });
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    unmount();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.isControlsCollapsed).toBe(true);
  });

  it('namespaces by userId — different users see different prefs', async () => {
    localStorage.setItem(
      `dinsight:u1:${SCOPED_KEY}`,
      JSON.stringify({ ...defaults, includeMonitoring: true })
    );
    localStorage.setItem(
      `dinsight:u2:${SCOPED_KEY}`,
      JSON.stringify({ ...defaults, activePlotTab: 'transitions' })
    );

    const { result: result1 } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: 1,
        initial: defaults,
      })
    );
    const { result: result2 } = renderHook(() =>
      useDebouncedLocalPrefs<UIPrefs>({
        localKey: SCOPED_KEY,
        userId: 2,
        initial: defaults,
      })
    );

    await waitFor(() => {
      expect(result1.current.isHydrated).toBe(true);
      expect(result2.current.isHydrated).toBe(true);
    });
    expect(result1.current.prefs.includeMonitoring).toBe(true);
    expect(result1.current.prefs.activePlotTab).toBe('distance');
    expect(result2.current.prefs.includeMonitoring).toBe(false);
    expect(result2.current.prefs.activePlotTab).toBe('transitions');
  });
});
