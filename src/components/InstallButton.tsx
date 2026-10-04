import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { useInstall } from "../lib/install";

/**
 * "Install the app" entry point. Uses the browser's own prompt when it offers one, shows the
 * Share-menu steps on iOS, and disappears once the app runs installed.
 */
export default function InstallButton({
  className = "btn btn-outline",
  onDone,
}: {
  className?: string;
  /** Called after the prompt or the guide closes (lets a menu close itself). */
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const { state, prompt } = useInstall();
  const [guide, setGuide] = useState(false);
  if (state === "installed" || state === "unsupported") return null;
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={async () => {
          if (state === "prompt") {
            await prompt();
            onDone?.();
          } else setGuide(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12 M7 10l5 5 5-5 M4 17v3h16v-3" />
        </svg>
        {t.install.label}
      </button>
      {guide && (
        <IosGuide
          onClose={() => {
            setGuide(false);
            onDone?.();
          }}
        />
      )}
    </>
  );
}

/** Safari has no install prompt: explain the Share → Add to Home Screen path. */
function IosGuide({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const steps = [t.install.iosStep1, t.install.iosStep2, t.install.iosStep3];
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-secondary/50 sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.install.iosTitle}
        className="card relative w-full max-w-md space-y-4 rounded-b-none p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-b-2xl"
      >
        <h2 className="font-display text-2xl font-bold">{t.install.iosTitle}</h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">
                {i === 0 && <ShareIcon />}
                {step}
              </span>
            </li>
          ))}
        </ol>
        <button ref={closeRef} type="button" onClick={onClose} className="btn btn-primary w-full">
          {t.install.gotIt}
        </button>
      </div>
    </div>
  );
}

/** Safari's share glyph, so the first step is recognisable at a glance. */
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mr-1.5 inline h-5 w-5 align-text-bottom text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v13 M8 7l4-4 4 4 M5 11v9h14v-9" />
    </svg>
  );
}
