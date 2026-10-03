import { ProviderError } from "../env";
import { strava } from "./strava";
import type { Provider, ProviderName } from "./types";

/** Every sign-in / activity provider the worker knows. Add Garmin & co here. */
export const PROVIDERS: Record<ProviderName, Provider> = { strava };

export const isProviderName = (v: string): v is ProviderName => v in PROVIDERS;

export function getProvider(name: string): Provider {
  if (!isProviderName(name)) throw new ProviderError(404, "unknown_provider", name);
  return PROVIDERS[name];
}
