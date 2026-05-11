'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readScoped, writeScoped } from '@/lib/scoped-storage';

/**
 * useDebouncedLocalPrefs — the local-only variant of the canonical
 * pref-sync pattern.
 *
 * Use this when a surface has preferences that should be remembered
 * across reloads on the SAME device but don't need cross-device sync
 * to the server. The insights page's UI layout toggles
 * (includeMonitoring, showWearSummaryMetrics, activePlotTab,
 * isControlsCollapsed) are the canonical example.
 *
 * The pattern:
 *
 *   1. On mount, hydrate from user-scoped localStorage so the UI doesn't
 *      flash defaults.
 *
 *   2. On setPrefs, update local state synchronously AND schedule a
 *      debounced localStorage write. Subsequent setPrefs within the
 *      window reset the timer; only the last value reaches storage.
 *
 *   3. On unmount, flush any pending write synchronously so the user
 *      doesn't lose their last edit on navigation.
 *
 * The difference from useDebouncedRemotePrefs: no fetchRemote /
 * saveRemote / mergeServerWithLocal. There is no network layer.
 * The debounce is purely about coalescing rapid writes so localStorage
 * doesn't get hammered (and so the JSON stringification cost is paid
 * once per burst, not once per keystroke).
 *
 * Type parameter T is the prefs payload. localKey is the BARE suffix
 * passed to scoped-storage; the active user id is read from `userId`.
 */
export interface UseDebouncedLocalPrefsOptions<T> {
  /** User-scoped localStorage suffix (no "dinsight:u<id>:" prefix). */
  localKey: string;
  /** Active user id; null/undefined namespaces under "guest". */
  userId: number | string | null | undefined;
  /** Initial state used until localStorage hydration completes. */
  initial: T;
  /** Debounce window in ms. Default 250. */
  debounceMs?: number;
}

export interface UseDebouncedLocalPrefsResult<T> {
  /** Current value. Reactively updates as the user mutates state. */
  prefs: T;
  /** Replace the prefs. Updates state synchronously; schedules a debounced write. */
  setPrefs: (next: T) => void;
  /** True once localStorage hydration has completed. */
  isHydrated: boolean;
  /** Flush any pending debounced write synchronously. */
  flushNow: () => void;
}

export function useDebouncedLocalPrefs<T>(
  opts: UseDebouncedLocalPrefsOptions<T>
): UseDebouncedLocalPrefsResult<T> {
  const { localKey, userId, initial, debounceMs = 250 } = opts;

  const [prefs, setPrefsState] = useState<T>(initial);
  const [isHydrated, setIsHydrated] = useState(false);

  // Refs let the unmount-flush + debounce timer access the latest
  // values without re-creating the effect on every render.
  const prefsRef = useRef<T>(initial);
  prefsRef.current = prefs;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // ----- Step 1: hydrate from localStorage. -----
  useEffect(() => {
    let cancelled = false;
    try {
      const raw = readScoped(localKey, userId);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        if (!cancelled) {
          setPrefsState(parsed);
          prefsRef.current = parsed;
        }
      }
    } catch {
      // Corrupt JSON: ignore, stick with `initial`.
    } finally {
      if (!cancelled) setIsHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, [localKey, userId]);

  // ----- Step 2: setPrefs schedules a debounced write. -----
  const setPrefs = useCallback(
    (next: T) => {
      setPrefsState(next);
      prefsRef.current = next;
      dirtyRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        dirtyRef.current = false;
        try {
          writeScoped(localKey, userId, JSON.stringify(prefsRef.current));
        } catch {
          // Storage quota errors: re-arm dirty so flushNow (or the
          // next setPrefs) can retry. The session continues with the
          // in-memory value either way.
          dirtyRef.current = true;
        }
      }, debounceMs);
    },
    [localKey, userId, debounceMs]
  );

  // flushNow is exposed for explicit "Save now" callers and used by
  // the unmount cleanup below.
  const flushNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      writeScoped(localKey, userId, JSON.stringify(prefsRef.current));
    } catch {
      dirtyRef.current = true;
    }
  }, [localKey, userId]);

  // ----- Step 3: flush pending write on unmount. -----
  useEffect(() => {
    return () => {
      flushNow();
    };
  }, [flushNow]);

  return {
    prefs,
    setPrefs,
    isHydrated,
    flushNow,
  };
}
