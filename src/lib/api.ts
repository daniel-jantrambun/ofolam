export type Activity = {
  id: number;
  name: string;
  sportType: string;
  startDate: string; // local time, "Z" suffixed (see format.ts)
  startUtc?: string; // real UTC start, used to detect back-to-back activities (multisport)
  distance: number; // meters
  movingTime: number; // seconds
  elapsedTime: number;
  elevation: number; // meters
  averageSpeed: number; // m/s
  averageWatts?: number | null; // rides with a power meter (or Strava's estimate)
  averageCadence?: number | null; // as sent by Strava: rpm for rides, steps of ONE leg for runs
  averageHeartrate?: number | null; // bpm, activities recorded with a heart rate sensor
  calories?: number | null; // kcal, only in the activity detail
  polyline: string | null;
};

import { cache } from "./cache";

const SESSION_KEY = "ofolam.session";
const STATE_KEY = "ofolam.oauthState";

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const hasPendingLogin = () => !!localStorage.getItem(STATE_KEY);

/** Sign-in providers the worker supports (see worker/providers). */
export type ProviderName = "strava";

export type Me = { provider: ProviderName; id: number; firstname: string | null; country: string | null };

/** `code` is an error code translated by the UI (see `src/i18n`, `errors`). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

function randomState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function startLogin(provider: ProviderName = "strava") {
  const state = randomState();
  localStorage.setItem(STATE_KEY, state);
  window.location.href = `/api/auth/${provider}/start?state=${state}`;
}

/**
 * Exchanges the pending state for a session.
 * Called on load and whenever the PWA comes back to the foreground: on iOS in standalone
 * mode, the OAuth callback opens in an in-app browser, not in the PWA.
 */
export async function claimPendingLogin(): Promise<boolean> {
  const state = localStorage.getItem(STATE_KEY);
  if (!state) return false;
  const res = await fetch("/api/auth/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });
  if (res.status !== 200) return false;
  const { session } = (await res.json()) as { session: string };
  localStorage.setItem(SESSION_KEY, session);
  localStorage.removeItem(STATE_KEY);
  return true;
}

export function cancelPendingLogin() {
  localStorage.removeItem(STATE_KEY);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${getSession() ?? ""}` },
    });
  } catch {
    throw new ApiError(0, "network");
  }
  if (res.status === 401) localStorage.removeItem(SESSION_KEY);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? "unknown");
  }
  return res.json();
}

export const getMe = () => api<Me>("/me");

// Stale-while-revalidate: `cached` is available immediately, `fresh` comes from the network.
export type Cached<T> = { cached: T | null; fresh: Promise<T> };

// ---------- Personal templates (see src/lib/templates.ts) ----------
export type StoredTemplate<T = unknown> = { id: string; name: string; options: T };
const TEMPLATES_CACHE_KEY = "templates";
const TEMPLATES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Stale-while-revalidate like the activities: the cached list shows up right away. */
export function listTemplates<T>(): Cached<StoredTemplate<T>[]> {
  const cached = cache.get<StoredTemplate<T>[]>(TEMPLATES_CACHE_KEY, TEMPLATES_MAX_AGE_MS);
  const fresh = api<StoredTemplate<T>[]>("/templates").then((list) => {
    cache.set(TEMPLATES_CACHE_KEY, list);
    return list;
  });
  return { cached, fresh };
}

export async function createTemplate<T>(name: string, options: T): Promise<StoredTemplate<T>> {
  const created = await api<StoredTemplate<T>>("/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, options }),
  });
  const list = cache.get<StoredTemplate<T>[]>(TEMPLATES_CACHE_KEY, TEMPLATES_MAX_AGE_MS) ?? [];
  cache.set(TEMPLATES_CACHE_KEY, [...list, created]);
  return created;
}

export async function deleteTemplate(id: string): Promise<void> {
  await api(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
  const list = cache.get<StoredTemplate[]>(TEMPLATES_CACHE_KEY, TEMPLATES_MAX_AGE_MS) ?? [];
  cache.set(
    TEMPLATES_CACHE_KEY,
    list.filter((t) => t.id !== id),
  );
}

/** Only the first page is cached: it is what the user sees when the app opens. */
const LIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** `refresh` bypasses both caches (local and worker) and refetches from Strava. */
export function listActivities(page = 1, refresh = false): Cached<Activity[]> {
  const key = `activities.p${page}`;
  const cached = page === 1 && !refresh ? cache.get<Activity[]>(key, LIST_MAX_AGE_MS) : null;
  const fresh = api<Activity[]>(`/activities?page=${page}${refresh ? "&fresh=1" : ""}`).then((list) => {
    if (page === 1) cache.set(key, list);
    return list;
  });
  return { cached, fresh };
}

export function getActivity(id: number, refresh = false): Cached<Activity> {
  const key = `activity.${id}`;
  const cached = refresh ? null : cache.get<Activity>(key, ACTIVITY_MAX_AGE_MS);
  const fresh = api<Activity>(`/activities/${id}${refresh ? "?fresh=1" : ""}`).then((a) => {
    cache.set(key, a);
    return a;
  });
  return { cached, fresh };
}

export async function logout() {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(SESSION_KEY);
  cache.clear();
}
