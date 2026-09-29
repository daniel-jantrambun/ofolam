import { Hono, type MiddlewareHandler } from "hono";
import { randomToken, sha256 } from "./crypto";
import { ACTIVITY_TTL_S, LIST_TTL_S, activityKey, cached, listKey } from "./cache";
import {
  type Env,
  STRAVA_BASE,
  StravaError,
  exchangeToken,
  now,
  saveTokens,
  stravaGet,
} from "./strava";

type AppEnv = { Bindings: Env; Variables: { athleteId: number } };

const SCOPE = "read,activity:read_all";
const STATE_TTL_S = 10 * 60;

const app = new Hono<AppEnv>().basePath("/api");

const redirectUri = (reqUrl: string) => `${new URL(reqUrl).origin}/api/auth/callback`;

// ---------- OAuth ----------

// The PWA generates a random `state`, keeps it in localStorage, then navigates here.
app.get("/auth/start", async (c) => {
  const state = c.req.query("state");
  if (!state || !/^[A-Za-z0-9_-]{32,128}$/.test(state)) return c.json({ error: "invalid_state" }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM oauth_states WHERE created_at < ?").bind(now() - 3600),
    c.env.DB.prepare("INSERT OR IGNORE INTO oauth_states (state, created_at) VALUES (?, ?)").bind(
      state,
      now(),
    ),
  ]);

  const url = new URL(`${STRAVA_BASE}/oauth/authorize`);
  url.search = new URLSearchParams({
    client_id: c.env.STRAVA_CLIENT_ID,
    redirect_uri: redirectUri(c.req.url),
    response_type: "code",
    approval_prompt: "auto",
    scope: SCOPE,
    state,
  }).toString();
  return c.redirect(url.toString());
});

app.get("/auth/callback", async (c) => {
  const { code, state, error, scope = "" } = c.req.query();
  if (error || !code || !state) return c.redirect("/?auth=denied");

  const pending = await c.env.DB.prepare(
    "SELECT created_at FROM oauth_states WHERE state = ? AND session_token IS NULL",
  )
    .bind(state)
    .first<{ created_at: number }>();
  if (!pending || pending.created_at < now() - STATE_TTL_S) return c.redirect("/?auth=expired");

  // The user may untick permissions on the Strava screen
  if (!scope.split(",").some((s) => s.startsWith("activity:read"))) {
    return c.redirect("/?auth=scope");
  }

  const t = await exchangeToken(c.env, { code, grant_type: "authorization_code" });
  if (!t.athlete) return c.redirect("/?auth=error");
  await saveTokens(c.env, t.athlete.id, t, { firstname: t.athlete.firstname, country: t.athlete.country, scope });

  const sessionToken = randomToken();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO sessions (id_hash, athlete_id, created_at) VALUES (?, ?, ?)").bind(
      await sha256(sessionToken),
      t.athlete.id,
      now(),
    ),
    c.env.DB.prepare("UPDATE oauth_states SET session_token = ? WHERE state = ?").bind(
      sessionToken,
      state,
    ),
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

const auth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return c.json({ error: "not_logged_in" }, 401);
  const row = await c.env.DB.prepare("SELECT athlete_id FROM sessions WHERE id_hash = ?")
    .bind(await sha256(token))
    .first<{ athlete_id: number }>();
  if (!row) return c.json({ error: "invalid_session" }, 401);
  c.set("athleteId", row.athlete_id);
  await next();
};

app.use("/me", auth);
app.use("/activities", auth);
app.use("/activities/*", auth);
app.use("/auth/logout", auth);

app.post("/auth/logout", async (c) => {
  const token = c.req.header("Authorization")!.slice(7);
  await c.env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256(token)).run();
  return c.json({ ok: true });
});

app.get("/me", async (c) => {
  const row = await c.env.DB.prepare("SELECT id, firstname, country FROM athletes WHERE id = ?")
    .bind(c.get("athleteId"))
    .first();
  return c.json(row);
});

type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  map?: { summary_polyline?: string | null; polyline?: string | null };
};

const toActivity = (a: StravaActivity) => ({
  id: a.id,
  name: a.name,
  sportType: a.sport_type,
  startDate: a.start_date_local,
  distance: a.distance,
  movingTime: a.moving_time,
  elapsedTime: a.elapsed_time,
  elevation: a.total_elevation_gain,
  averageSpeed: a.average_speed,
  polyline: a.map?.polyline || a.map?.summary_polyline || null,
});

app.get("/activities", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const athleteId = c.get("athleteId");
  const list = await cached(c.env, listKey(athleteId, page), LIST_TTL_S, async () => {
    const raw = await stravaGet<StravaActivity[]>(c.env, athleteId, `/athlete/activities?per_page=20&page=${page}`);
    return raw.map(toActivity);
  });
  return c.json(list);
});

app.get("/activities/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) return c.json({ error: "invalid_id" }, 400);
  const athleteId = c.get("athleteId");
  // The detail carries `map.polyline`, more precise than the list's summary_polyline
  const activity = await cached(c.env, activityKey(athleteId, id), ACTIVITY_TTL_S, async () => {
    const raw = await stravaGet<StravaActivity>(c.env, athleteId, `/activities/${id}`);
    return toActivity(raw);
  });
  return c.json(activity);
});

app.onError((err, c) => {
  if (err instanceof StravaError) {
    return c.json({ error: err.code }, err.status as 401 | 404 | 429 | 502);
  }
  console.error(err);
  return c.json({ error: "internal" }, 500);
});

export default app;
