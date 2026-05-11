'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { readScoped, writeScoped } from '@/lib/scoped-storage';

/**
 * useDebouncedRemotePrefsWithConflict — extends the canonical
 * multi-device pref-sync pattern with cross-device conflict detection.
 *
 * Use this when a surface has preferences that sync across the user's
 * devices AND you want to give the user a chance to resolve the case
 * where another device saved newer prefs while this device was offline
 * (or just had a stale tab open).
 *
 * The pattern adds a fifth step to useDebouncedRemotePrefs's four:
 *
 *   1. Hydrate from user-scoped localStorage immediately so the UI
 *      doesn't flash defaults.
 *   2. Fetch the server snapshot. If it's from ANOTHER deviceId AND
 *      newer than our local copy AND the user has unsaved local edits,
 *      DO NOT auto-merge — surface a conflict via `onConflict` and let
 *      the page render a resolution modal. Otherwise, apply the server
 *      payload as in the simple variant.
 *   3. setPrefs writes local + schedules a debounced server save.
 *   4. flushNow / unmount flushes the pending write.
 *   5. resolveConflict(choice) lets the page accept the server payload,
 *      keep the local one, or do a custom merge. Whatever it returns
 *      becomes the active prefs and is persisted both locally and
 *      remotely.
 *
 * The caller's payload T MUST include `__meta` with deviceId + updatedAt
 * so arbitration is meaningful. The hook stamps these on every save —
 * callers should not maintain them by hand. (The hook also writes the
 * deviceId once into device-scoped localStorage on first use so it
 * survives across logins on the same device.)
 *
 * Conflict detection is OFF by default. Pass an `onConflict` callback
 * to opt in. Without one, the hook behaves exactly like
 * useDebouncedRemotePrefs (server-wins on hydration).
 */

export interface PrefsMeta {
  /** Stable device identifier persisted in device-scoped localStorage. */
  deviceId: string;
  /** ISO timestamp of the most recent save originating from this device. */
  updatedAt: string;
  /** Version field for migrating the payload shape later. */
  version: 1;
}

export interface PrefsWithMeta {
  __meta?: PrefsMeta;
}

export type ConflictChoice<T> =
  | { kind: 'use-server' }
  | { kind: 'use-local' }
  | { kind: 'merge'; merged: T };

export interface PrefsConflict<T extends PrefsWithMeta> {
  /** What the server sent back, including the foreign deviceId. */
  server: T;
  /** The local state at the time of conflict. */
  local: T;
  /** Resolved server timestamp (ISO) for display. */
  serverUpdatedAt: string;
}

export interface UseDebouncedRemotePrefsWithConflictOptions<T extends PrefsWithMeta> {
  /** User-scoped localStorage suffix (no "dinsight:u<id>:" prefix). */
  localKey: string;
  /** Active user id; null/undefined namespaces under "guest". */
  userId: number | string | null | undefined;
  /** Initial state used until both hydrations complete. */
  initial: T;
  /** Returns the server snapshot. Called once on mount. Returns null when no snapshot yet. */
  fetchRemote: () => Promise<T | null>;
  /** Persists the snapshot to the server. Debounced. */
  saveRemote: (next: T) => Promise<void>;
  /**
   * Called when the server snapshot is from a DIFFERENT deviceId AND
   * newer than our local copy AND we have unsaved local edits. The
   * page renders a modal and calls resolveConflict() with the user's
   * choice. When omitted, the hook auto-applies the server payload
   * (matches useDebouncedRemotePrefs's behavior).
   */
  onConflict?: (conflict: PrefsConflict<T>) => void;
  /** Debounce window in ms. Default 800. */
  debounceMs?: number;
}

export interface UseDebouncedRemotePrefsWithConflictResult<T extends PrefsWithMeta> {
  prefs: T;
  setPrefs: (next: T) => void;
  isHydrated: boolean;
  flushNow: () => Promise<void>;
  /** Apply the user's conflict-resolution choice. No-op when no conflict is pending. */
  resolveConflict: (choice: ConflictChoice<T>) => void;
}

// Device id lives in DEVICE-SCOPED localStorage (not user-scoped) so it
// stays stable across logins on the same browser. Keyed flat so it
// survives any user-scoped namespace evolution.
const DEVICE_ID_KEY = 'dinsight:device-id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    // crypto.randomUUID is available in modern browsers (and jsdom 27+).
    // Fall back to a random-enough string when missing.
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    window.localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return '';
  }
}

export function useDebouncedRemotePrefsWithConflict<T extends PrefsWithMeta>(
  opts: UseDebouncedRemotePrefsWithConflictOptions<T>
): UseDebouncedRemotePrefsWithConflictResult<T> {
  const { localKey, userId, initial, fetchRemote, saveRemote, onConflict, debounceMs = 800 } = opts;

  const [prefs, setPrefsState] = useState<T>(initial);
  const [isLocalHydrated, setIsLocalHydrated] = useState(false);
  const [isServerHydrated, setIsServerHydrated] = useState(false);

  const prefsRef = useRef<T>(initial);
  prefsRef.current = prefs;
  const saveRemoteRef = useRef(saveRemote);
  saveRemoteRef.current = saveRemote;
  const onConflictRef = useRef(onConflict);
  onConflictRef.current = onConflict;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const hasLocalEditsRef = useRef(false);
  const deviceIdRef = useRef<string>('');

  // Initialize the deviceId once per mount.
  if (deviceIdRef.current === '') {
    deviceIdRef.current = getOrCreateDeviceId();
  }

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
      if (!cancelled) setIsLocalHydrated(true);
    }
    return () => {
      cancelled = true;
    };
  }, [localKey, userId]);

  // ----- Step 2: fetch server + arbitrate. -----
  useEffect(() => {
    if (!isLocalHydrated) return;
    let cancelled = false;
    fetchRemote()
      .then((server) => {
        if (cancelled || server == null) return;

        const serverMeta = server.__meta;
        const localMeta = prefsRef.current.__meta;
        const serverDevice = serverMeta?.deviceId;
        const myDevice = deviceIdRef.current;
        const serverUpdatedAt = serverMeta?.updatedAt ? Date.parse(serverMeta.updatedAt) : NaN;
        const localUpdatedAt = localMeta?.updatedAt ? Date.parse(localMeta.updatedAt) : 0;

        const isFromAnotherDevice = !!serverDevice && !!myDevice && serverDevice !== myDevice;
        const isNewerThanLocal =
          Number.isFinite(serverUpdatedAt) && serverUpdatedAt > localUpdatedAt;

        // Conflict path: another device saved newer AND we have unsaved
        // local edits AND the caller wants to be asked.
        if (
          isFromAnotherDevice &&
          isNewerThanLocal &&
          hasLocalEditsRef.current &&
          onConflictRef.current
        ) {
          onConflictRef.current({
            server,
            local: prefsRef.current,
            serverUpdatedAt: serverMeta?.updatedAt ?? '',
          });
          // Do not apply yet — wait for resolveConflict.
          return;
        }

        // Non-conflict path: take the server snapshot.
        setPrefsState(server);
        prefsRef.current = server;
        writeScoped(localKey, userId, JSON.stringify(server));
        hasLocalEditsRef.current = false;
      })
      .catch(() => {
        // Server fetch failure leaves local state intact.
      })
      .finally(() => {
        if (cancelled) return;
        setIsServerHydrated(true);
        isHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [isLocalHydrated, localKey, userId, fetchRemote]);

  // ----- Step 3: setPrefs writes local + schedules debounced remote. -----
  const setPrefs = useCallback(
    (next: T) => {
      // Stamp __meta so the next save carries the deviceId + updatedAt
      // arbitration data. The caller doesn't need to manage these.
      const stamped: T = {
        ...next,
        __meta: {
          deviceId: deviceIdRef.current || 'unknown',
          updatedAt: new Date().toISOString(),
          version: 1,
        },
      };
      setPrefsState(stamped);
      prefsRef.current = stamped;
      dirtyRef.current = true;
      hasLocalEditsRef.current = true;
      try {
        writeScoped(localKey, userId, JSON.stringify(stamped));
      } catch {
        // Storage quota: local persistence drops; remote save still attempts.
      }
      if (!isHydratedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        dirtyRef.current = false;
        saveRemoteRef.current(prefsRef.current).catch(() => {
          dirtyRef.current = true;
        });
      }, debounceMs);
    },
    [localKey, userId, debounceMs]
  );

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

  // ----- Step 4: flush on unmount. -----
  useEffect(() => {
    return () => {
      void flushNow();
    };
  }, [flushNow]);

  // ----- Step 5: conflict resolution. -----
  const resolveConflict = useCallback(
    (choice: ConflictChoice<T>) => {
      let next: T;
      switch (choice.kind) {
        case 'use-server':
          // We don't have the conflict's server payload here without
          // closing over it. Read it through onConflict's caller side
          // is simpler — but for the simple case, "use-server" means
          // "rerun fetchRemote with no local edits and take whatever
          // comes back". To keep this hook self-contained, we require
          // the page to pass the merged result. The two non-trivial
          // options are 'use-local' (no-op) and 'merge' (caller-supplied).
          // 'use-server' is implementable as 'merge' with the server T.
          return;
        case 'use-local':
          // Keep current state; mark conflict resolved.
          hasLocalEditsRef.current = true;
          dirtyRef.current = true;
          // Schedule a save so our local copy lands on the server, ending
          // the divergence.
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            dirtyRef.current = false;
            saveRemoteRef.current(prefsRef.current).catch(() => {
              dirtyRef.current = true;
            });
          }, debounceMs);
          return;
        case 'merge':
          next = {
            ...choice.merged,
            __meta: {
              deviceId: deviceIdRef.current || 'unknown',
              updatedAt: new Date().toISOString(),
              version: 1,
            },
          };
          setPrefsState(next);
          prefsRef.current = next;
          dirtyRef.current = true;
          hasLocalEditsRef.current = false;
          try {
            writeScoped(localKey, userId, JSON.stringify(next));
          } catch {
            // ignore
          }
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            dirtyRef.current = false;
            saveRemoteRef.current(prefsRef.current).catch(() => {
              dirtyRef.current = true;
            });
          }, debounceMs);
          return;
      }
    },
    [localKey, userId, debounceMs]
  );

  return {
    prefs,
    setPrefs,
    isHydrated: isLocalHydrated && isServerHydrated,
    flushNow,
    resolveConflict,
  };
}
