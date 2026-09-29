import { startLogin } from "../lib/api";
import { LangSwitcher, useI18n } from "../i18n";
import { ThemeSwitcher } from "../theme";

export default function Login({ notice }: { notice?: string }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="flex items-center justify-end gap-2">
        <ThemeSwitcher />
        <LangSwitcher />
      </div>
      <svg viewBox="0 0 320 180" className="w-full text-primary" aria-hidden="true">
        <path
          d="M18 150 C 40 90, 70 160, 96 110 S 130 30, 170 60 S 210 150, 246 118 S 290 40, 302 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="150" r="10" fill="var(--color-background)" stroke="currentColor" strokeWidth="6" />
        <circle cx="302" cy="30" r="11" fill="currentColor" />
      </svg>

      <div>
        <h1 className="font-display text-7xl leading-[0.9] font-bold">{t.login.title}</h1>
        <p className="mt-5 max-w-[34ch] text-lg text-muted">{t.login.subtitle}</p>
      </div>

      <div className="space-y-4">
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {/* Strava brand guidelines: replace with the official "Connect with Strava" button */}
        <button
          onClick={startLogin}
          className="btn btn-accent w-full min-h-14 text-lg"
        >
          {t.login.connect}
        </button>
      </div>
    </main>
  );
}
