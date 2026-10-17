import { useEffect, useState } from 'react';

/**
 * Like useState, but the value is saved to localStorage. `parse` validates
 * what comes back, so broken or old data can't crash the app. Storage can be
 * unavailable (private mode, blocked cookies), so every access is guarded.
 */
export function readStored<T>(key: string, fallback: T, parse: (raw: unknown) => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function useLocalStorage<T>(key: string, fallback: T, parse: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => readStored(key, fallback, parse));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage is full or blocked: keep working in memory.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
