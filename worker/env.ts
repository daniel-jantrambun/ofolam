/** Worker bindings and secrets (see wrangler.jsonc and .dev.vars.example). */
export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  TOKEN_KEY: string;
  /** Local debugging only (`.dev.vars`): "1" keeps raw provider responses in KV under `debug:`. */
  DEBUG_STRAVA?: string;
};

/** Error codes are translated by the PWA (see `src/i18n`). */
export type ErrorCode =
  | "token_exchange_failed"
  | "unknown_athlete"
  | "rate_limited"
  | "strava_revoked"
  | "activity_not_found"
  | "strava_error"
  | "unknown_provider";

/** Error raised by a provider call, mapped to an HTTP status and a translatable code. */
export class ProviderError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

export const now = () => Math.floor(Date.now() / 1000);
