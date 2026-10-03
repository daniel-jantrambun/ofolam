import type { Env } from "../env";

/** Provider identifiers, as stored in D1 and used in `/api/auth/:provider/...`. */
export type ProviderName = "strava";

/** The activity shape the PWA works with, whatever the provider (mirrors `src/lib/api.ts`). */
export type Activity = {
  id: number;
  name: string;
  sportType: string;
  startDate: string;
  startUtc: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevation: number;
  averageSpeed: number;
  averageWatts: number | null;
  averageCadence: number | null;
  polyline: string | null;
};

export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

export type AthleteProfile = { id: number; firstname: string | null; country: string | null };

/** Outcome of an OAuth callback: either a signed-in athlete, or a reason shown by the PWA. */
export type CallbackResult =
  | { ok: true; athlete: AthleteProfile; tokens: Tokens; scope: string | null }
  | { ok: false; reason: "denied" | "expired" | "scope" | "error" };

/**
 * What a sign-in / activity provider must implement. Token storage, sessions and caching are
 * shared (see `../tokens.ts`, `../index.ts`); a provider only knows its own API.
 */
export interface Provider {
  readonly name: ProviderName;
  /** Where to send the browser to authorize the app. */
  authorizeUrl(env: Env, redirectUri: string, state: string): string;
  /** Turns the callback query into tokens and a profile (or a failure reason). */
  handleCallback(env: Env, query: Record<string, string>): Promise<CallbackResult>;
  /** Refreshes an expired access token. */
  refresh(env: Env, refreshToken: string): Promise<Tokens>;
  listActivities(env: Env, athleteId: number, page: number): Promise<Activity[]>;
  getActivity(env: Env, athleteId: number, id: string): Promise<Activity>;
}
