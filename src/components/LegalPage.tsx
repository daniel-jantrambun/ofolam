import { type Locale, useI18n } from "../i18n";
import { type LegalPageKey, legalEn } from "../legal/en";
import { legalFr } from "../legal/fr";
import SettingsMenu from "./SettingsMenu";

export type { LegalPageKey };

// Legal texts exist in English and French only; the other languages fall back to English rather
// than showing an unreviewed translation of a legal document.
const DOCS: Record<Locale, typeof legalEn> = {
  en: legalEn,
  fr: legalFr,
  es: legalEn,
  it: legalEn,
  de: legalEn,
};

/** Publisher identity, from the environment (see .env.example). */
const NAME = import.meta.env.VITE_LEGAL_NAME || "[VITE_LEGAL_NAME]";
const EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "[VITE_CONTACT_EMAIL]";
const fill = (s: string) => s.replaceAll("{name}", NAME).replaceAll("{email}", EMAIL);

export const LEGAL_PAGES: LegalPageKey[] = ["privacy", "terms", "legal"];
export const legalHref = (page: LegalPageKey) => `#/${page}`;

/** Links to the three legal pages, e.g. under the sign-in button. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const { locale } = useI18n();
  const docs = DOCS[locale];
  return (
    <nav className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs ${className}`}>
      {LEGAL_PAGES.map((page) => (
        <a key={page} href={legalHref(page)} className="link">
          {docs.links[page]}
        </a>
      ))}
    </nav>
  );
}

export default function LegalPage({ page }: { page: LegalPageKey }) {
  const { locale } = useI18n();
  const docs = DOCS[locale];
  const doc = docs[page];
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <a href="#/" className="link text-sm">
          ← {docs.back}
        </a>
        <SettingsMenu />
      </div>
      <article className="card space-y-6 p-5 sm:p-8">
        <header>
          <h1 className="font-display text-4xl font-bold leading-tight">{doc.title}</h1>
          <p className="mt-1 text-sm text-muted">{doc.updated}</p>
        </header>
        {doc.sections.map((s) => (
          <section key={s.heading} className="space-y-2">
            <h2 className="font-display text-2xl font-semibold">{s.heading}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="leading-relaxed">
                {fill(p)}
              </p>
            ))}
          </section>
        ))}
      </article>
      <LegalLinks className="mt-6" />
    </main>
  );
}
