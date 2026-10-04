import { faqDe } from "../faq/de";
import { type FaqDoc, faqEn } from "../faq/en";
import { faqEs } from "../faq/es";
import { faqFr } from "../faq/fr";
import { faqIt } from "../faq/it";
import { type Locale, useI18n } from "../i18n";
import { LegalLinks } from "./LegalPage";
import SettingsMenu from "./SettingsMenu";

const DOCS: Record<Locale, FaqDoc> = { en: faqEn, fr: faqFr, es: faqEs, it: faqIt, de: faqDe };

export const FAQ_HREF = "#/faq";

const EMAIL = import.meta.env.VITE_CONTACT_EMAIL || "[VITE_CONTACT_EMAIL]";
const COFFEE_URL = import.meta.env.VITE_COFFEE_URL;
const fill = (s: string) => s.replaceAll("{email}", EMAIL);

/** Questions and answers about data retention, publishing and the app itself. */
export default function FaqPage() {
  const { locale, t } = useI18n();
  const doc = DOCS[locale];
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <a href="#/" className="link text-sm">
          ← {doc.back}
        </a>
        <SettingsMenu />
      </div>
      <article className="card space-y-8 p-5 sm:p-8">
        <header>
          <h1 className="font-display text-4xl font-bold leading-tight">{doc.title}</h1>
          <p className="mt-2 text-muted">{doc.intro}</p>
        </header>
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">{section.heading}</h2>
            <div className="divide-y divide-border border-y border-border">
              {section.items.map((item) => (
                // Native disclosure: keyboard and screen-reader support come for free
                <details key={item.q} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="space-y-1.5 pb-4">
                    {item.a.map((p) => (
                      <p key={p} className="leading-relaxed text-muted">
                        {fill(p)}
                      </p>
                    ))}
                    {item.coffee && COFFEE_URL && (
                      <p className="leading-relaxed text-muted">
                        {item.coffee}{" "}
                        <a href={COFFEE_URL} target="_blank" rel="noreferrer" className="link">
                          {t.coffee.label}
                        </a>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </article>
      <LegalLinks className="mt-6" />
    </main>
  );
}
