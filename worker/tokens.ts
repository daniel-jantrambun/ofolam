import { decrypt, encrypt } from "./crypto";
import { type Env, now, ProviderError } from "./env";
import type { AthleteProfile, Provider, Tokens } from "./providers/types";

const REFRESH_MARGIN_S = 120;

/** Stores (or updates) an athlete's encrypted tokens and profile for a provider. */
export async function saveTokens(
  env: Env,
  provider: Provider,
  athleteId: number,
  t: Tokens,
  extra?: Partial<AthleteProfile> & { scope?: string | null },
) {
  const [access, refresh] = await Promise.all([
    encrypt(t.accessToken, env.TOKEN_KEY),
    encrypt(t.refreshToken, env.TOKEN_KEY),
  ]);
  await env.DB.prepare(
    `INSERT INTO athletes (provider, id, firstname, country, access_token, refresh_token, expires_at, scope, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
     ON CONFLICT(provider, id) DO UPDATE SET
       firstname = COALESCE(?3, firstname),
       country = COALESCE(?4, country),
       access_token = ?5, refresh_token = ?6, expires_at = ?7,
       scope = COALESCE(?8, scope), updated_at = ?9`,
  )
    .bind(
      provider.name,
      athleteId,
      extra?.firstname ?? null,
      extra?.country ?? null,
      access,
      refresh,
      t.expiresAt,
      extra?.scope ?? null,
      now(),
    )
    .run();
}

/** Returns a valid access token for the athlete at this provider, refreshing it when needed. */
export async function getAccessToken(env: Env, provider: Provider, athleteId: number): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT access_token, refresh_token, expires_at FROM athletes WHERE provider = ? AND id = ?",
  )
    .bind(provider.name, athleteId)
    .first<{ access_token: string; refresh_token: string; expires_at: number }>();
  if (!row) throw new ProviderError(401, "unknown_athlete");

  if (row.expires_at > now() + REFRESH_MARGIN_S) {
    return decrypt(row.access_token, env.TOKEN_KEY);
  }

  const refreshToken = await decrypt(row.refresh_token, env.TOKEN_KEY);
  const t = await provider.refresh(env, refreshToken);
  // Providers may rotate the refresh token: always store the latest one
  await saveTokens(env, provider, athleteId, t);
  return t.accessToken;
}
