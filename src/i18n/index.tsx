import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Dictionary, en } from "./en";
import { fr } from "./fr";

export type Locale = "en" | "fr";
export const LOCALES: Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };

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
 * Strava does not expose a language preference, only the athlete's country.
 * Map French-speaking countries to `fr`, everything else to the default.
 */
const FRENCH_COUNTRIES = new Set([
  "france",
  "belgium",
  "belgique",
  "switzerland",
  "suisse",
  "luxembourg",
  "monaco",
]);
export function localeFromCountry(country: string | null | undefined): Locale | null {
  if (!country) return null;
  return FRENCH_COUNTRIES.has(country.trim().toLowerCase()) ? "fr" : DEFAULT_LOCALE;
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

export function LangSwitcher({ className = "" }: { className?: string }) {
  const { locale, t, setLocale } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.lang.label} className={`seg text-xs md:text-sm ${className}`}>
      {LOCALES.map((l) => (
        <button
          type="button"
          key={l}
          role="radio"
          aria-checked={locale === l}
          onClick={() => setLocale(l)}
          className="seg-item !px-2.5 uppercase"
        >
          {l}
        </button>
      ))}
    </div>
  );
}
