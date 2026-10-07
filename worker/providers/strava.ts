import { type Env, ProviderError } from "../env";
import { getAccessToken } from "../tokens";
import type { Activity, CallbackResult, Provider, Tokens } from "./types";

const BASE = "https://www.strava.com";
const SCOPE = "read,activity:read_all";

/** Raw responses kept for inspection when DEBUG_STRAVA=1 (24 h, local dev only). */
const DEBUG_TTL_S = 24 * 60 * 60;
export const debugKey = (athleteId: number, path: string) => `debug:strava:${athleteId}:${path}`;

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; country?: string | null };
};

type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  average_watts?: number;
  average_cadence?: number;
  average_heartrate?: number;
  /** Only in the activity detail, not in the list. */
  calories?: number;
  map?: { summary_polyline?: string | null; polyline?: string | null };
};

const toActivity = (a: StravaActivity): Activity => ({
  id: a.id,
  name: a.name,
  sportType: a.sport_type,
  startDate: a.start_date_local,
  startUtc: a.start_date,
  distance: a.distance,
  movingTime: a.moving_time,
  elapsedTime: a.elapsed_time,
  elevation: a.total_elevation_gain,
  averageSpeed: a.average_speed,
  averageWatts: a.average_watts ?? null,
  averageCadence: a.average_cadence ?? null,
  averageHeartrate: a.average_heartrate ?? null,
  calories: a.calories ?? null,
  polyline: a.map?.polyline || a.map?.summary_polyline || null,
});

const toTokens = (t: TokenResponse): Tokens => ({
  accessToken: t.access_token,
  refreshToken: t.refresh_token,
  expiresAt: t.expires_at,
});

async function exchange(env: Env, params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      ...params,
    }),
  });
  if (!res.ok)
    throw new ProviderError(res.status === 400 ? 401 : 502, "token_exchange_failed", String(res.status));
  return res.json();
}

async function get<T>(env: Env, athleteId: number, path: string): Promise<T> {
  const token = await getAccessToken(env, strava, athleteId);
  const res = await fetch(`${BASE}/api/v3${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) throw new ProviderError(429, "rate_limited");
  if (res.status === 401) throw new ProviderError(401, "strava_revoked");
  if (res.status === 404) throw new ProviderError(404, "activity_not_found");
  if (!res.ok) throw new ProviderError(502, "strava_error", String(res.status));
  if (env.DEBUG_STRAVA === "1") {
    // Keep the untouched payload so it can be inspected with `pnpm debug:strava`
    const raw = await res.text();
    await env.CACHE.put(debugKey(athleteId, path), raw, { expirationTtl: DEBUG_TTL_S });
    console.log(`[debug] strava ${path} → ${raw.length} bytes, saved as ${debugKey(athleteId, path)}`);
    return JSON.parse(raw) as T;
  }
  return res.json();
}

export const strava: Provider = {
  name: "strava",

  authorizeUrl(env, redirectUri, state) {
    const url = new URL(`${BASE}/oauth/authorize`);
    url.search = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: SCOPE,
      state,
    }).toString();
    return url.toString();
  },

  async handleCallback(env, query): Promise<CallbackResult> {
    const { code, error, scope = "" } = query;
    if (error || !code) return { ok: false, reason: "denied" };
    // The user may untick permissions on the Strava screen
    if (!scope.split(",").some((s) => s.startsWith("activity:read"))) return { ok: false, reason: "scope" };
    const t = await exchange(env, { code, grant_type: "authorization_code" });
    if (!t.athlete) return { ok: false, reason: "error" };
    return {
      ok: true,
      athlete: {
        id: t.athlete.id,
        firstname: t.athlete.firstname ?? null,
        country: t.athlete.country ?? null,
      },
      tokens: toTokens(t),
      scope,
    };
  },

  async refresh(env, refreshToken) {
    return toTokens(await exchange(env, { grant_type: "refresh_token", refresh_token: refreshToken }));
  },

  async listActivities(env, athleteId, page) {
    const raw = await get<StravaActivity[]>(env, athleteId, `/athlete/activities?per_page=20&page=${page}`);
    return raw.map(toActivity);
  },

  async getActivity(env, athleteId, id) {
    // The detail carries `map.polyline`, more precise than the list's summary_polyline
    return toActivity(await get<StravaActivity>(env, athleteId, `/activities/${id}`));
  },
};
