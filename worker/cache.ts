import type { Env } from "./strava";

/** Activities list: short TTL so a freshly recorded activity shows up quickly. */
export const LIST_TTL_S = 5 * 60;
/** Single activity: past activities almost never change. */
export const ACTIVITY_TTL_S = 24 * 60 * 60;

/**
 * Read-through cache on Workers KV.
 * Returns the cached value when present, otherwise runs `loader` and stores its result.
 * KV is eventually consistent (up to ~60s to propagate), which is fine for this data.
 */
export async function cached<T>(
  env: Env,
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  /** Skip the cached value (user-requested refresh); the fresh result is still stored. */
  bypass = false,
): Promise<T> {
  const hit = bypass ? null : await env.CACHE.get<T>(key, "json");
  if (hit !== null) return hit;
  const value = await loader();
  await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  return value;
}

export const listKey = (athleteId: number, page: number) => `activities:${athleteId}:p${page}`;
export const activityKey = (athleteId: number, id: string | number) => `activity:${athleteId}:${id}`;
