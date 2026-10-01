import { useEffect, useId, useRef, useState } from "react";
import { LangSwitcher, useI18n } from "../i18n";
import { ThemeSwitcher } from "../theme";

/**
 * Theme + language switchers behind a burger button that opens a small popover.
 * Closes on outside click, Escape, or after picking an option.
 */
export default function SettingsMenu({
  className = "",
  onRefresh,
}: {
  className?: string;
  /** When given, a "Refresh" entry reloads the current data from Strava, bypassing caches. */
  onRefresh?: () => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t.settings.label}
        title={t.settings.label}
        className="btn btn-outline btn-sm !px-2.5"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d={open ? "M6 6l12 12 M18 6L6 18" : "M4 7h16 M4 12h16 M4 17h16"} />
        </svg>
      </button>
      {open && (
        <div id={panelId} className="card absolute right-0 top-full z-20 mt-2 w-max space-y-3 p-3">
          {/* Any choice closes the panel */}
          {onRefresh && (
            <button
              type="button"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await onRefresh();
                } finally {
                  setRefreshing(false);
                  setOpen(false);
                }
              }}
              className="btn btn-outline btn-sm w-full justify-start"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 12a8 8 0 1 1-2.3-5.7 M20 4v5h-5" />
              </svg>
              {t.settings.refresh}
            </button>
          )}
          <div>
            <p className="field-label">{t.theme.label}</p>
            <ThemeSwitcher onPick={() => setOpen(false)} />
          </div>
          <div>
            <p className="field-label">{t.lang.label}</p>
            <LangSwitcher onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
