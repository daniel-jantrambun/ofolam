export type Activity = {
  id: number;
  name: string;
  sportType: string;
  startDate: string;
  distance: number; // mètres
  movingTime: number; // secondes
  elapsedTime: number;
  elevation: number; // mètres
  averageSpeed: number; // m/s
  polyline: string | null;
};

import { cache } from "./cache";

const SESSION_KEY = "oflm.session";
const STATE_KEY = "oflm.oauthState";

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const hasPendingLogin = () => !!localStorage.getItem(STATE_KEY);

export type Me = { id: number; firstname: string | null; country: string | null };

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
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function startLogin() {
  const state = randomState();
  localStorage.setItem(STATE_KEY, state);
  window.location.href = `/api/auth/start?state=${state}`;
}

/**
 * Échange le state en attente contre une session.
 * Appelé au chargement et quand la PWA revient au premier plan : sur iOS en mode
 * standalone, le callback OAuth s'ouvre dans un navigateur intégré, pas dans la PWA.
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

// Stale-while-revalidate : `cached` est disponible tout de suite, `fresh` arrive du réseau.
export type Cached<T> = { cached: T | null; fresh: Promise<T> };

/** Only the first page is cached: it is what the user sees when the app opens. */
const LIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const ACTIVITY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function listActivities(page = 1): Cached<Activity[]> {
  const key = `activities.p${page}`;
  const cached = page === 1 ? cache.get<Activity[]>(key, LIST_MAX_AGE_MS) : null;
  const fresh = api<Activity[]>(`/activities?page=${page}`).then((list) => {
    if (page === 1) cache.set(key, list);
    return list;
  });
  return { cached, fresh };
}

export function getActivity(id: number): Cached<Activity> {
  const key = `activity.${id}`;
  const cached = cache.get<Activity>(key, ACTIVITY_MAX_AGE_MS);
  const fresh = api<Activity>(`/activities/${id}`).then((a) => {
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
