import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { de } from "./de";
import { type Dictionary, en } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";

export type Locale = "en" | "fr" | "es" | "it" | "de";
export const LOCALES: Locale[] = ["en", "fr", "es", "it", "de"];
export const DEFAULT_LOCALE: Locale = "en";

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr, es, it, de };

const COOKIE = "ofolam.lang";
const COOKIE_MAX_AGE_S = 365 * 24 * 60 * 60;

const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as string[]).includes(v);

/** Explicit user choice, persisted in a cookie. */
export function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE.replace(".", "\\.")}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return isLocale(value) ? value : null;
}

function writeLocaleCookie(locale: Locale) {
  document.cookie = `${COOKIE}=${locale}; max-age=${COOKIE_MAX_AGE_S}; path=/; SameSite=Lax`;
}

/**
 * Strava does not expose a language preference, only the athlete's country, as free text in the
 * athlete's own language. Map the countries where one of our languages dominates; everything
 * else gets the default. Switzerland stays French (the historical choice), the user can switch.
 */
const COUNTRY_LOCALES: Record<string, Locale> = {
  france: "fr",
  belgium: "fr",
  belgique: "fr",
  switzerland: "fr",
  suisse: "fr",
  schweiz: "fr",
  luxembourg: "fr",
  monaco: "fr",
  spain: "es",
  españa: "es",
  mexico: "es",
  méxico: "es",
  argentina: "es",
  colombia: "es",
  chile: "es",
  peru: "es",
  perú: "es",
  venezuela: "es",
  ecuador: "es",
  uruguay: "es",
  bolivia: "es",
  paraguay: "es",
  guatemala: "es",
  "costa rica": "es",
  panama: "es",
  panamá: "es",
  "dominican republic": "es",
  "república dominicana": "es",
  "el salvador": "es",
  honduras: "es",
  nicaragua: "es",
  cuba: "es",
  italy: "it",
  italia: "it",
  "san marino": "it",
  germany: "de",
  deutschland: "de",
  austria: "de",
  österreich: "de",
  liechtenstein: "de",
};
export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  return COUNTRY_LOCALES[country.trim().toLowerCase()] ?? DEFAULT_LOCALE;
}

type I18n = {
  locale: Locale;
  t: Dictionary;
  /** User choice from the switcher: persisted in the cookie. */
  setLocale: (locale: Locale) => void;
  /** Hint from the Strava profile: applied only when no cookie is set. */
  suggestLocale: (locale: Locale | null) => void;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [cookieLocale, setCookieLocale] = useState<Locale | null>(readLocaleCookie);
  const [suggested, setSuggested] = useState<Locale | null>(null);

  // Priority: cookie > Strava profile > default
  const locale = cookieLocale ?? suggested ?? DEFAULT_LOCALE;

  const setLocale = useCallback((l: Locale) => {
    writeLocaleCookie(l);
    setCookieLocale(l);
  }, []);
  const suggestLocale = useCallback((l: Locale | null) => setSuggested(l), []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(
    () => ({ locale, t: DICTIONARIES[locale], setLocale, suggestLocale }),
    [locale, setLocale, suggestLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** `onPick` fires after a choice, e.g. to close a menu holding the switcher. */
export function LangSwitcher({ className = "", onPick }: { className?: string; onPick?: () => void }) {
  const { locale, t, setLocale } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.lang.label} className={`seg seg-sm ${className}`}>
      {LOCALES.map((l) => (
        <button
          type="button"
          key={l}
          role="radio"
          aria-checked={locale === l}
          onClick={() => {
            setLocale(l);
            onPick?.();
          }}
          className="seg-item uppercase"
        >
          {l}
        </button>
      ))}
    </div>
  );
}
