import { useEffect, useId, useRef, useState } from "react";
import { LangSwitcher, useI18n } from "../i18n";
import { ThemeSwitcher } from "../theme";
import InstallButton from "./InstallButton";

/**
 * Theme + language switchers behind a burger button that opens a small popover.
 * Closes on outside click, Escape, or after picking an option.
 */
export type MenuAction = { label: string; onClick: () => void; disabled?: boolean };

export default function SettingsMenu({
  className = "",
  onRefresh,
  actions = [],
}: {
  className?: string;
  /** When given, a "Refresh" entry reloads the current data from Strava, bypassing caches. */
  onRefresh?: () => Promise<void> | void;
  /** Page-specific entries shown at the top of the menu (e.g. back, copy, download). */
  actions?: MenuAction[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Opens upwards when there is not enough room below the button (e.g. mobile editor toolbar)
  const [openUp, setOpenUp] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const PANEL_ESTIMATE_PX = 260;
  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect();
      setOpenUp(
        !!rect && window.innerHeight - rect.bottom < PANEL_ESTIMATE_PX && rect.top > PANEL_ESTIMATE_PX,
      );
    }
    setOpen((o) => !o);
  };
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
        ref={buttonRef}
        onClick={toggle}
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
        <div
          id={panelId}
          // Anchored to the button's right edge, so it must never be wider than the room on its left
          // (the button is not always at the screen edge, e.g. next to the share button in the editor)
          className={`card absolute right-0 z-20 w-max max-w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3 ${openUp ? "bottom-full mb-2" : "top-full mt-2"}`}
        >
          {/* Any choice closes the panel */}
          {actions.length > 0 && (
            <div className="flex flex-col gap-1">
              {actions.map((a) => (
                <button
                  type="button"
                  key={a.label}
                  disabled={a.disabled}
                  onClick={() => {
                    setOpen(false);
                    a.onClick();
                  }}
                  className="btn btn-ghost btn-sm justify-start"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
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
          {/* Hash route: the page swaps without leaving the app (see App.tsx) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              location.hash = "/faq";
            }}
            className="btn btn-ghost btn-sm w-full justify-start"
          >
            {t.settings.faq}
          </button>
          <InstallButton
            className="btn btn-outline btn-sm w-full justify-start"
            onDone={() => setOpen(false)}
          />
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
