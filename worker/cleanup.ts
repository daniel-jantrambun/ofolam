import { type Env, now } from "./env";

/** Sessions unused for this long are dropped, and with them athletes left without a session. */
export const SESSION_IDLE_DAYS = 90;
/** `last_seen_at` is refreshed at most once per day, to avoid a write on every request. */
export const LAST_SEEN_STEP_S = 24 * 60 * 60;

/**
 * Removes stale sessions, then every athlete (with their encrypted tokens) that no session
 * refers to any more. Also prunes abandoned OAuth states. Run nightly by the cron trigger.
 */
export async function cleanup(env: Env): Promise<{ sessions: number; athletes: number }> {
  const cutoff = now() - SESSION_IDLE_DAYS * 24 * 60 * 60;
  const sessions = await env.DB.prepare("DELETE FROM sessions WHERE last_seen_at < ?").bind(cutoff).run();
  const athletes = await env.DB.prepare(
    `DELETE FROM athletes WHERE NOT EXISTS (
       SELECT 1 FROM sessions s WHERE s.provider = athletes.provider AND s.athlete_id = athletes.id
     )`,
  ).run();
  await env.DB.prepare("DELETE FROM oauth_states WHERE created_at < ?")
    .bind(now() - 3600)
    .run();
  return { sessions: sessions.meta.changes ?? 0, athletes: athletes.meta.changes ?? 0 };
}

/** Deletes an athlete and all their sessions (sign-out of the last session, revoked access). */
export async function forgetAthlete(env: Env, provider: string, athleteId: number) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE provider = ? AND athlete_id = ?").bind(provider, athleteId),
    env.DB.prepare("DELETE FROM athletes WHERE provider = ? AND id = ?").bind(provider, athleteId),
  ]);
}
