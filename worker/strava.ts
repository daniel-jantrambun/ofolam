import { decrypt, encrypt } from "./crypto";

export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  TOKEN_KEY: string;
};

export const STRAVA_BASE = "https://www.strava.com";
const REFRESH_MARGIN_S = 120;

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; country?: string | null };
};

/** Error codes are translated by the PWA (see `src/i18n`). */
export type ErrorCode =
  | "token_exchange_failed"
  | "unknown_athlete"
  | "rate_limited"
  | "strava_revoked"
  | "activity_not_found"
  | "strava_error";

export class StravaError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

export const now = () => Math.floor(Date.now() / 1000);

export async function exchangeToken(
  env: Env,
  params: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetch(`${STRAVA_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      ...params,
    }),
  });
  if (!res.ok) throw new StravaError(res.status === 400 ? 401 : 502, "token_exchange_failed", String(res.status));
  return res.json();
}

export async function saveTokens(
  env: Env,
  athleteId: number,
  t: TokenResponse,
  extra?: { firstname?: string; country?: string | null; scope?: string },
) {
  const [access, refresh] = await Promise.all([
    encrypt(t.access_token, env.TOKEN_KEY),
    encrypt(t.refresh_token, env.TOKEN_KEY),
  ]);
  await env.DB.prepare(
    `INSERT INTO athletes (id, firstname, country, access_token, refresh_token, expires_at, scope, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     ON CONFLICT(id) DO UPDATE SET
       firstname = COALESCE(?2, firstname),
       country = COALESCE(?3, country),
       access_token = ?4, refresh_token = ?5, expires_at = ?6,
       scope = COALESCE(?7, scope), updated_at = ?8`,
  )
    .bind(
      athleteId,
      extra?.firstname ?? null,
      extra?.country ?? null,
      access,
      refresh,
      t.expires_at,
      extra?.scope ?? null,
      now(),
    )
    .run();
}

/** Renvoie un access token valide, en le rafraîchissant si besoin. */
export async function getAccessToken(env: Env, athleteId: number): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT access_token, refresh_token, expires_at FROM athletes WHERE id = ?",
  )
    .bind(athleteId)
    .first<{ access_token: string; refresh_token: string; expires_at: number }>();
  if (!row) throw new StravaError(401, "unknown_athlete");

  if (row.expires_at > now() + REFRESH_MARGIN_S) {
    return decrypt(row.access_token, env.TOKEN_KEY);
  }

  const refreshToken = await decrypt(row.refresh_token, env.TOKEN_KEY);
  const t = await exchangeToken(env, { grant_type: "refresh_token", refresh_token: refreshToken });
  // Strava peut renvoyer un nouveau refresh token : on stocke toujours le dernier
  await saveTokens(env, athleteId, t);
  return t.access_token;
}

export async function stravaGet<T>(env: Env, athleteId: number, path: string): Promise<T> {
  const token = await getAccessToken(env, athleteId);
  const res = await fetch(`${STRAVA_BASE}/api/v3${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) {
    throw new StravaError(429, "rate_limited");
  }
  if (res.status === 401) throw new StravaError(401, "strava_revoked");
  if (res.status === 404) throw new StravaError(404, "activity_not_found");
  if (!res.ok) throw new StravaError(502, "strava_error", String(res.status));
  return res.json();
}
