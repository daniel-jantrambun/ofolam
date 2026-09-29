import { useCallback, useEffect, useState } from "react";
import { claimPendingLogin, getMe, getSession, hasPendingLogin, logout } from "./lib/api";
import { localeFromCountry, useI18n } from "./i18n";
import Login from "./components/Login";
import ActivityList from "./components/ActivityList";
import Editor from "./components/Editor";

const AUTH_KEYS = ["denied", "expired", "scope", "error"] as const;
type AuthKey = (typeof AUTH_KEYS)[number];
const isAuthKey = (v: string | null): v is AuthKey => (AUTH_KEYS as readonly string[]).includes(v ?? "");

export default function App() {
  const { t, suggestLocale } = useI18n();
  const [session, setSession] = useState(getSession);
  const [selected, setSelected] = useState<number | null>(null);
  const [authParam] = useState(() => new URLSearchParams(location.search).get("auth"));

  const tryClaim = useCallback(async () => {
    if (hasPendingLogin() && (await claimPendingLogin())) setSession(getSession());
  }, []);

  useEffect(() => {
    if (authParam) history.replaceState(null, "", "/");
    tryClaim();
    const onVisible = () => document.visibilityState === "visible" && tryClaim();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authParam, tryClaim]);

  const onSessionLost = useCallback(() => setSession(getSession()), []);

  // Langue suggérée par le pays du profil Strava (le cookie garde la priorité)
  useEffect(() => {
    if (!session) return suggestLocale(null);
    getMe()
      .then((me) => suggestLocale(localeFromCountry(me.country)))
      .catch(() => {});
  }, [session, suggestLocale]);

  if (!session) {
    // Callback ouvert dans le navigateur intégré iOS : la session attend la PWA
    const doneElsewhere = authParam === "done" && !hasPendingLogin();
    const notice = doneElsewhere ? t.login.doneElsewhere : isAuthKey(authParam) ? t.auth[authParam] : undefined;
    return <Login notice={notice} />;
  }

  if (selected !== null) {
    return <Editor activityId={selected} onBack={() => setSelected(null)} onSessionLost={onSessionLost} />;
  }

  return (
    <ActivityList
      onSelect={setSelected}
      onSessionLost={onSessionLost}
      onLogout={async () => {
        await logout();
        setSession(null);
      }}
    />
  );
}
