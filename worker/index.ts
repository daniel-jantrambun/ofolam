import { Hono, type MiddlewareHandler } from "hono";
import { ACTIVITY_TTL_S, activityKey, cached, LIST_TTL_S, listKey } from "./cache";
import { cleanup, forgetAthlete, LAST_SEEN_STEP_S } from "./cleanup";
import { randomToken, sha256 } from "./crypto";
import { type Env, now, ProviderError } from "./env";
import { getProvider, isProviderName } from "./providers";
import type { ProviderName } from "./providers/types";
import { saveTokens } from "./tokens";

type AppEnv = { Bindings: Env; Variables: { athleteId: number; provider: ProviderName } };

const STATE_TTL_S = 10 * 60;

const app = new Hono<AppEnv>().basePath("/api");

const redirectUri = (reqUrl: string, provider: ProviderName) =>
  `${new URL(reqUrl).origin}/api/auth/${provider}/callback`;

// ---------- OAuth (one flow per provider: /api/auth/strava/start, /api/auth/strava/callback) ----------

// The PWA generates a random `state`, keeps it in localStorage, then navigates here.
app.get("/auth/:provider/start", async (c) => {
  const provider = getProvider(c.req.param("provider"));
  const state = c.req.query("state");
  if (!state || !/^[A-Za-z0-9_-]{32,128}$/.test(state)) return c.json({ error: "invalid_state" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM oauth_states WHERE created_at < ?").bind(now() - 3600),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO oauth_states (state, provider, created_at) VALUES (?, ?, ?)",
    ).bind(state, provider.name, now()),
  ]);

  return c.redirect(provider.authorizeUrl(c.env, redirectUri(c.req.url, provider.name), state));
});

app.get("/auth/:provider/callback", async (c) => {
  const provider = getProvider(c.req.param("provider"));
  const query = c.req.query();
  const { state } = query;
  if (!state) return c.redirect("/?auth=denied");

  const pending = await c.env.DB.prepare(
    "SELECT created_at FROM oauth_states WHERE state = ? AND provider = ? AND session_token IS NULL",
  )
    .bind(state, provider.name)
    .first<{ created_at: number }>();
  if (!pending || pending.created_at < now() - STATE_TTL_S) return c.redirect("/?auth=expired");

  const result = await provider.handleCallback(c.env, query);
  if (!result.ok) return c.redirect(`/?auth=${result.reason}`);
  await saveTokens(c.env, provider, result.athlete.id, result.tokens, {
    firstname: result.athlete.firstname,
    country: result.athlete.country,
    scope: result.scope,
  });

  const sessionToken = randomToken();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO sessions (id_hash, provider, athlete_id, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(await sha256(sessionToken), provider.name, result.athlete.id, now(), now()),
    c.env.DB.prepare("UPDATE oauth_states SET session_token = ? WHERE state = ?").bind(sessionToken, state),
  ]);

  return c.redirect("/?auth=done");
});

// The PWA exchanges its `state` for the session token (single use).
app.post("/auth/claim", async (c) => {
  const body = await c.req.json<{ state?: string }>().catch(() => ({}) as { state?: string });
  if (!body.state) return c.json({ error: "invalid_state" }, 400);

  const row = await c.env.DB.prepare(
    "DELETE FROM oauth_states WHERE state = ? AND session_token IS NOT NULL RETURNING session_token",
  )
    .bind(body.state)
    .first<{ session_token: string }>();
  if (!row) return c.json({ pending: true }, 202);
  return c.json({ session: row.session_token });
});

// ---------- Authenticated routes ----------

// The session remembers which provider signed the athlete in: every data route uses it
const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "not_logged_in" }, 401);
  const idHash = await sha256(token);
  const row = await c.env.DB.prepare(
    "SELECT provider, athlete_id, last_seen_at FROM sessions WHERE id_hash = ?",
  )
    .bind(idHash)
    .first<{ provider: string; athlete_id: number; last_seen_at: number }>();
  if (!row || !isProviderName(row.provider)) return c.json({ error: "invalid_session" }, 401);
  c.set("athleteId", row.athlete_id);
  c.set("provider", row.provider);
  // Keep the session alive for the cleanup, at most one write per day
  if (row.last_seen_at < now() - LAST_SEEN_STEP_S) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?").bind(now(), idHash).run(),
    );
  }
  await next();
};

app.use("/me", auth);
app.use("/activities", auth);
app.use("/activities/*", auth);
app.use("/auth/logout", auth);

app.post("/auth/logout", async (c) => {
  const token = c.req.header("Authorization")!.slice(7);
  await c.env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?")
    .bind(await sha256(token))
    .run();
  // Last session gone: forget the athlete and their tokens (they sign in again in one tap)
  const left = await c.env.DB.prepare("SELECT 1 FROM sessions WHERE provider = ? AND athlete_id = ? LIMIT 1")
    .bind(c.get("provider"), c.get("athleteId"))
    .first();
  if (!left) await forgetAthlete(c.env, c.get("provider"), c.get("athleteId"));
  return c.json({ ok: true });
});

app.get("/me", async (c) => {
  const row = await c.env.DB.prepare(
    "SELECT provider, id, firstname, country FROM athletes WHERE provider = ? AND id = ?",
  )
    .bind(c.get("provider"), c.get("athleteId"))
    .first();
  return c.json(row);
});

app.get("/activities", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const athleteId = c.get("athleteId");
  const provider = getProvider(c.get("provider"));
  const fresh = c.req.query("fresh") === "1";
  const list = await cached(
    c.env,
    listKey(provider.name, athleteId, page),
    LIST_TTL_S,
    () => provider.listActivities(c.env, athleteId, page),
    fresh,
  );
  return c.json(list);
});

app.get("/activities/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "invalid_id" }, 400);
  const athleteId = c.get("athleteId");
  const provider = getProvider(c.get("provider"));
  const fresh = c.req.query("fresh") === "1";
  const activity = await cached(
    c.env,
    activityKey(provider.name, athleteId, id),
    ACTIVITY_TTL_S,
    () => provider.getActivity(c.env, athleteId, id),
    fresh,
  );
  return c.json(activity);
});

app.onError((err, c) => {
  if (err instanceof ProviderError) {
    // Access revoked at the provider: the stored tokens are dead, drop the athlete
    if (err.code === "strava_revoked" && c.get("provider") && c.get("athleteId")) {
      c.executionCtx.waitUntil(forgetAthlete(c.env, c.get("provider"), c.get("athleteId")));
    }
    return c.json({ error: err.code }, err.status as 401 | 404 | 429 | 502);
  }
  console.error(err);
  return c.json({ error: "internal" }, 500);
});

export default {
  fetch: app.fetch,
  /** Nightly cleanup of stale sessions and orphaned athletes (cron in wrangler.jsonc). */
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      cleanup(env).then((r) => console.log(`[cleanup] sessions: ${r.sessions}, athletes: ${r.athletes}`)),
    );
  },
};
