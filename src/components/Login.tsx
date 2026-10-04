import { useI18n } from "../i18n";
import { startLogin } from "../lib/api";
import InstallButton from "./InstallButton";
import { LegalLinks } from "./LegalPage";
import SettingsMenu from "./SettingsMenu";

export default function Login({ notice }: { notice?: string }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <div className="flex justify-end">
        <SettingsMenu />
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
        <circle
          cx="18"
          cy="150"
          r="10"
          fill="var(--color-background)"
          stroke="currentColor"
          strokeWidth="6"
        />
        <circle cx="302" cy="30" r="11" fill="currentColor" />
      </svg>

      <div className="text-center">
        <h1 className="font-display text-7xl leading-[0.9] font-bold">{t.login.title}</h1>
        <p className="mx-auto mt-5 max-w-[34ch] text-lg text-muted">{t.login.subtitle}</p>
      </div>

      <div className="space-y-4">
        {notice && (
          <p role="status" className="notice text-center">
            {notice}
          </p>
        )}
        {/* Official "Connect with Strava" button (brand guidelines): used as-is, never restyled */}
        <button
          type="button"
          onClick={() => startLogin("strava")}
          aria-label={t.login.connect}
          className="mx-auto block rounded-md transition-transform active:scale-[0.98]"
        >
          <img src="/strava/connect-with-strava-orange.svg" alt="" className="h-12 w-auto" />
        </button>
        <InstallButton className="btn btn-outline mx-auto flex" />
        <LegalLinks />
      </div>
    </main>
  );
}
