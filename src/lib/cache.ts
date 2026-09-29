/**
 * Small localStorage cache for API responses.
 *
 * Used in a stale-while-revalidate fashion: components render the cached value
 * immediately, then refresh it from the API in the background.
 */
const PREFIX = "oflm.cache.";
/** Keep at most this many single-activity entries (each one carries a polyline). */
const MAX_ACTIVITY_ENTRIES = 30;

type Entry<T> = { savedAt: number; data: T };

function read<T>(key: string): Entry<T> | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Entry<T>) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data } satisfies Entry<T>));
  } catch {
    // Quota exceeded or storage disabled: the cache is a best-effort optimisation.
  }
}

export const cache = {
  get<T>(key: string, maxAgeMs: number): T | null {
    const entry = read<T>(key);
    if (!entry || Date.now() - entry.savedAt > maxAgeMs) return null;
    return entry.data;
  },
  set<T>(key: string, data: T) {
    write(key, data);
    if (key.startsWith("activity.")) evictOldActivities();
  },
  clear() {
    for (const k of keys()) localStorage.removeItem(k);
  },
};

function keys(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) out.push(k);
  }
  return out;
}

function evictOldActivities() {
  const entries = keys()
    .filter((k) => k.startsWith(PREFIX + "activity."))
    .map((k) => ({ k, savedAt: read<unknown>(k.slice(PREFIX.length))?.savedAt ?? 0 }))
    .sort((a, b) => b.savedAt - a.savedAt);
  for (const { k } of entries.slice(MAX_ACTIVITY_ENTRIES)) localStorage.removeItem(k);
}
