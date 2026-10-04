import { useCallback, useEffect, useState } from "react";
import ActivityList from "./components/ActivityList";
import Editor, { type EditorSubject } from "./components/Editor";
import FaqPage, { FAQ_HREF } from "./components/FaqPage";
import LegalPage, { LEGAL_PAGES, type LegalPageKey } from "./components/LegalPage";
import Login from "./components/Login";
import { localeFromCountry, useI18n } from "./i18n";
import { claimPendingLogin, getMe, getSession, hasPendingLogin, logout } from "./lib/api";

const AUTH_KEYS = ["denied", "expired", "scope", "error"] as const;
type AuthKey = (typeof AUTH_KEYS)[number];
const isAuthKey = (v: string | null): v is AuthKey => (AUTH_KEYS as readonly string[]).includes(v ?? "");

/** Hash routes for the legal pages: #/privacy, #/terms, #/legal. Anything else is the app. */
function legalPageFromHash(): LegalPageKey | null {
  const key = location.hash.replace(/^#\/?/, "");
  return (LEGAL_PAGES as string[]).includes(key) ? (key as LegalPageKey) : null;
}

const isFaqHash = () => location.hash === FAQ_HREF;

export default function App() {
  const { t, suggestLocale } = useI18n();
  const [session, setSession] = useState(getSession);
  const [selected, setSelected] = useState<EditorSubject | null>(null);
  const [authParam] = useState(() => new URLSearchParams(location.search).get("auth"));
  const [legalPage, setLegalPage] = useState(legalPageFromHash);
  const [faq, setFaq] = useState(isFaqHash);

  useEffect(() => {
    const onHash = () => {
      setLegalPage(legalPageFromHash());
      setFaq(isFaqHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  // Language suggested by the Strava profile's country (the cookie takes precedence)
  useEffect(() => {
    if (!session) return suggestLocale(null);
    getMe()
      .then((me) => suggestLocale(localeFromCountry(me.country)))
      .catch(() => {});
  }, [session, suggestLocale]);

  if (legalPage) return <LegalPage page={legalPage} />;
  if (faq) return <FaqPage />;

  if (!session) {
    // Callback opened in the iOS in-app browser: the session is waiting for the PWA
    const doneElsewhere = authParam === "done" && !hasPendingLogin();
    const notice = doneElsewhere
      ? t.login.doneElsewhere
      : isAuthKey(authParam)
        ? t.auth[authParam]
        : undefined;
    return <Login notice={notice} />;
  }

  if (selected !== null) {
    return <Editor subject={selected} onBack={() => setSelected(null)} onSessionLost={onSessionLost} />;
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
