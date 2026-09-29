import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";

export type Theme = "light" | "dark" | "system";
const KEY = "ofolam.theme";

const read = (): Theme => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};

type ThemeCtx = { theme: Theme; setTheme: (t: Theme) => void; resolved: "light" | "dark" };
const Ctx = createContext<ThemeCtx | null>(null);

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(read);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSysDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    // Browser chrome (address bar) follows the page
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0F1A1F" : "#17252B");
  }, [theme, resolved]);

  const setTheme = useCallback((t: Theme) => {
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      // storage unavailable: the choice just won't persist
    }
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

const ICONS: Record<Theme, string> = {
  light: "M12 4v2 M12 18v2 M4 12h2 M18 12h2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4 M12 8a4 4 0 100 8 4 4 0 000-8z",
  dark: "M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z",
  system: "M4 6h16v10H4z M9 20h6 M12 16v4",
};
const ORDER: Theme[] = ["light", "system", "dark"];

/** Segmented light / system / dark toggle. */
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.theme.label} className={`seg ${className}`}>
      {ORDER.map((opt) => (
        <button
          key={opt}
          role="radio"
          aria-checked={theme === opt}
          aria-label={t.theme[opt]}
          title={t.theme[opt]}
          onClick={() => setTheme(opt)}
          className="seg-item !px-2.5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[opt]} />
          </svg>
        </button>
      ))}
    </div>
  );
}
