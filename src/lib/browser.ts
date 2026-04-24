
export const isBrowser = () => typeof window !== 'undefined';

export function safeLocalStorageGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // no-op
  }
}

export function safeLocalStorageRemove(key: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}
