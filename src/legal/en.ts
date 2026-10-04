/**
 * Legal pages content. `{name}` and `{email}` are replaced at render time with
 * VITE_LEGAL_NAME / VITE_CONTACT_EMAIL. Sections are plain paragraphs, no HTML.
 */
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; updated: string; sections: LegalSection[] };
export type LegalPageKey = "privacy" | "terms" | "legal";
export type LegalContent = Record<LegalPageKey, LegalDoc> & {
  links: Record<LegalPageKey, string>;
  back: string;
};

export const legalEn: LegalContent = {
  links: { privacy: "Privacy policy", terms: "Terms of use", legal: "Legal notice" },
  back: "Back to the app",

  privacy: {
    title: "Privacy policy",
    updated: "Last updated: 30 September 2026",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "Ofolam is a free web app published by {name}. It turns a Strava activity into a shareable picture. Questions about your data: {email}.",
        ],
      },
      {
        heading: "What we collect",
        paragraphs: [
          "When you sign in with Strava, we receive and store your Strava athlete id, first name and country, together with the access and refresh tokens Strava issues to us. Tokens are encrypted before storage and only used to read your activities on your behalf.",
          "Your activities (name, sport, date, distance, duration, elevation, average speed and GPS route) are fetched from Strava when you use the app. They are cached for at most 24 hours on our side to stay within Strava's rate limits, and on your device so the app opens quickly.",
          "Photos you add to a picture never leave your device: the picture is drawn in your browser. The map background, when enabled, is fetched from a third-party tile server (Stadia Maps by default), which then receives the area of your route and your IP address, like any online map.",
          "We use no analytics, no advertising and no tracking. A cookie stores your language choice; your browser's local storage keeps your session, theme and a cache of your activities.",
        ],
      },
      {
        heading: "Why and on what basis",
        paragraphs: [
          "We process this data only to provide the service you asked for: signing in with Strava and creating pictures from your activities. The legal basis is the performance of that service at your request.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Your athlete record and tokens are kept while you have an active session. Signing out of your last session deletes them immediately. A session unused for 90 days is deleted automatically, and so is your record once no session remains. If you revoke the app's access on Strava, your record is deleted the next time the app notices it. Cached activities expire within 24 hours.",
        ],
      },
      {
        heading: "Where it is stored",
        paragraphs: [
          "Data is stored on Cloudflare's infrastructure (Cloudflare, Inc., San Francisco, USA), which may process it in data centres outside the European Union under its standard contractual clauses.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can revoke Ofolam's access at any time from your Strava settings (My apps). Doing so makes our stored tokens useless. To have your record deleted, or to access, correct or export your data, write to {email}. You may also lodge a complaint with your data protection authority.",
        ],
      },
      {
        heading: "Strava",
        paragraphs: [
          "Ofolam uses the Strava API and is not affiliated with Strava. Strava's own terms and privacy policy apply to your Strava account.",
        ],
      },
    ],
  },

  terms: {
    title: "Terms of use",
    updated: "Last updated: 30 September 2026",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "Ofolam lets you create pictures from your own Strava activities and share them. It is provided free of charge, as is, without any warranty of availability or accuracy. We may change or stop the service at any time.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "You need a Strava account. You are responsible for the pictures you create and share, and for having the rights to any photo you add to them.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "Do not use the service to access data you are not entitled to, to overload the service or the Strava API, or for any unlawful purpose.",
        ],
      },
      {
        heading: "Trademarks",
        paragraphs: [
          "Strava and the Strava logo are trademarks of Strava, Inc. Pictures created with Ofolam carry the mention “Powered by Strava” as required by the Strava API terms. Map data is © OpenStreetMap contributors and its tile provider, as credited on the picture.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "To the extent permitted by law, {name} is not liable for any damage resulting from the use or unavailability of the service.",
        ],
      },
      { heading: "Governing law", paragraphs: ["These terms are governed by French law."] },
    ],
  },

  legal: {
    title: "Legal notice",
    updated: "Last updated: 30 September 2026",
    sections: [
      { heading: "Publisher", paragraphs: ["{name}", "Contact: {email}"] },
      {
        heading: "Hosting",
        paragraphs: ["Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, United States."],
      },
      {
        heading: "Source code",
        paragraphs: [
          "Ofolam is open source, under the GNU AGPL v3 license: anyone running a modified version as a service must publish its source code.",
        ],
      },
    ],
  },
};
