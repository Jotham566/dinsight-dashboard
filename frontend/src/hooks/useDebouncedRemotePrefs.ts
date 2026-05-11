'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readScoped, writeScoped } from '@/lib/scoped-storage';

/**
 * useDebouncedRemotePrefs — the canonical multi-device preference sync
 * pattern, extracted from src/app/dashboard/live/page.tsx where it was
 * entangled with 30+ other useState slices.
 *
 * The pattern (named in the engineering review as "hydrate-local-first,
 * merge-fresh-server-before-save, debounce, flush-on-unmount"):
 *
 *   1. On mount, hydrate from user-scoped localStorage immediately so
 *      the UI doesn't flash defaults while the server fetch is in
 *      flight. This is the highest-leverage step for perceived speed
 *      and the source of the most race-condition regressions when
 *      done wrong.
 *
 *   2. When the server fetch resolves, MERGE the server payload over
 *      whatever the user has typed locally — don't overwrite. The
 *      merge function is supplied by the caller because the policy
 *      (server wins / local wins / field-by-field) is application-
 *      specific.
 *
 *   3. Writes are debounced to the network. setPrefs updates local
 *      state + localStorage synchronously (so the next reload reads
 *      what the user just did), then schedules a network PUT after
 *      `debounceMs`. Subsequent setPrefs within the window reset the
 *      timer; only the last value reaches the server.
 *
 *   4. On unmount (route change, tab close, navigation), the pending
 *      write is flushed synchronously so the user doesn't lose their
 *      last edit. flushOnUnmount uses a useEffect cleanup that runs
 *      AFTER the debounced write would have fired.
 *
 * Type parameter T is the prefs payload. fetchRemote returns the
 * latest server snapshot (or null when there is none). saveRemote
 * persists a snapshot. mergeServerWithLocal decides how to combine
 * the two on first hydration. localKey is the BARE suffix passed to
 * scoped-storage; the active user id is read from `userId`.
 */
export interface UseDebouncedRemotePrefsOptions<T> {
  /** User-scoped localStorage suffix (no "dinsight:u<id>:" prefix). */
  localKey: string;
  /** Active user id; null/undefined namespaces under "guest". */
  userId: number | string | null | undefined;
  /** Initial state used until both local hydration and fetchRemote complete. */
  initial: T;
  /**
   * Returns the server snapshot for this user. Called once on mount.
   * Return null when the server has no snapshot yet (first-time user).
   */
  fetchRemote: () => Promise<T | null>;
  /** Persists the snapshot to the server. Debounced by `debounceMs`. */
  saveRemote: (next: T) => Promise<void>;
  /**
   * Merges the server snapshot with the locally-hydrated value. The
   * default is server-wins; pass a function when individual fields
   * should be preserved (e.g. work-in-progress text fields).
   */
  mergeServerWithLocal?: (server: T, local: T) => T;
  /** Debounce window in ms. Default 800. */
  debounceMs?: number;
}

export interface UseDebouncedRemotePrefsResult<T> {
  /** Current value. Reactively updates as the user mutates state. */
  prefs: T;
  /** Replace the prefs. Updates state + localStorage; schedules a debounced server save. */
  setPrefs: (next: T) => void;
  /**
   * True once local hydration AND server hydration have both completed
   * (or fetchRemote has thrown / returned null). UI can use this to
   * disable controls during the brief race window.
   */
  isHydrated: boolean;
  /** Flush any pending debounced save. Exposed for "Save now" buttons. */
  flushNow: () => Promise<void>;
}

export function useDebouncedRemotePrefs<T>(
  opts: UseDebouncedRemotePrefsOptions<T>
): UseDebouncedRemotePrefsResult<T> {
  const {
    localKey,
    userId,
    initial,
    fetchRemote,
    saveRemote,
    mergeServerWithLocal,
    debounceMs = 800,
  } = opts;

  const [prefs, setPrefsState] = useState<T>(initial);
  const [isLocalHydrated, setIsLocalHydrated] = useState(false);
  const [isServerHydrated, setIsServerHydrated] = useState(false);

  // Refs let the unmount-flush + debounce timer access the latest
  // values without re-creating the effect on every render.
  const prefsRef = useRef<T>(initial);
  prefsRef.current = prefs;
  const saveRemoteRef = useRef(saveRemote);
  saveRemoteRef.current = saveRemote;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratedRef = useRef(false);
  const dirtyRef = useRef(false);

  // ----- Step 1: hydrate from localStorage immediately. -----
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
      if (!cancelled) setIsLocalHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, [localKey, userId]);

  // ----- Step 2: merge server payload over locally-hydrated value. -----
  useEffect(() => {
    if (!isLocalHydrated) return;
    let cancelled = false;
    fetchRemote()
      .then((server) => {
        if (cancelled) return;
        if (server != null) {
          const merged = mergeServerWithLocal
            ? mergeServerWithLocal(server, prefsRef.current)
            : server;
          setPrefsState(merged);
          prefsRef.current = merged;
          // Persist the merged result locally so the next reload doesn't
          // flash the pre-merge state.
          writeScoped(localKey, userId, JSON.stringify(merged));
        }
      })
      .catch(() => {
        // Server fetch failure leaves local state intact. The user can
        // still work; the next setPrefs will try to persist again.
      })
      .finally(() => {
        if (cancelled) return;
        setIsServerHydrated(true);
        isHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [isLocalHydrated, localKey, userId, fetchRemote, mergeServerWithLocal]);

  // ----- Step 3: setPrefs writes local + schedules debounced remote. -----
  const setPrefs = useCallback(
    (next: T) => {
      setPrefsState(next);
      prefsRef.current = next;
      dirtyRef.current = true;
      try {
        writeScoped(localKey, userId, JSON.stringify(next));
      } catch {
        // Storage quota errors: local persistence drops; remote save
        // still attempts (the next reload may flash defaults if the
        // server save also fails, but no data is lost from this session).
      }
      // Don't fire the remote save until both hydrations have run.
      // The merge logic in step 2 might overwrite the value we'd be
      // saving here, leading to a stale write.
      if (!isHydratedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        dirtyRef.current = false;
        saveRemoteRef.current(prefsRef.current).catch(() => {
          // Mark dirty again so flushOnUnmount retries.
          dirtyRef.current = true;
        });
      }, debounceMs);
    },
    [localKey, userId, debounceMs]
  );

  // flushNow is exposed for explicit "Save now" buttons and used by
  // the unmount cleanup below.
  const flushNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    try {
      await saveRemoteRef.current(prefsRef.current);
    } catch {
      dirtyRef.current = true;
    }
  }, []);

  // ----- Step 4: flush pending write on unmount. -----
  useEffect(() => {
    return () => {
      // fire-and-forget on unmount. We can't await an async cleanup, so
      // we rely on the save being short and the network keeping the
      // request alive past the unload event.
      void flushNow();
    };
  }, [flushNow]);

  return {
    prefs,
    setPrefs,
    isHydrated: isLocalHydrated && isServerHydrated,
    flushNow,
  };
}
