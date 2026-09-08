"use client";

import { useCallback, useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readStorage<T>(key: string, initial: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return initial;
    return JSON.parse(raw) as T;
  } catch {
    return initial;
  }
}

/**
 * Persist a small client preference (e.g. dismissed banners).
 * Do not store precise geolocation or secrets.
 */
export function useLocalStorageState<T>(key: string, initial: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => readStorage(key, initial),
    () => initial,
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readStorage(key, initial);
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        window.dispatchEvent(new Event("storage"));
      } catch {
        // quota / private mode
      }
    },
    [initial, key],
  );

  return { value, setValue, hydrated: true } as const;
}
