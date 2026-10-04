# Ofolam

A PWA that turns a Strava activity into a shareable visual (Instagram story or post, transparent sticker).

Stack: Vite + React + Tailwind v4, a Cloudflare Worker (Hono) for the API, D1 for tokens, KV for caching.

## Strava apps

Strava allows a single *Authorization Callback Domain* per app, so the project uses two apps
created at https://www.strava.com/settings/api:

| App | Callback domain | Where its ids go |
|---|---|---|
| dev | `localhost` | `.dev.vars` (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`) |
| production | your domain | `wrangler.jsonc` → `vars.STRAVA_CLIENT_ID`; secret via `pnpm wrangler secret put` |

In `pnpm dev`, values from `.dev.vars` override `vars` from `wrangler.jsonc`, so the worker uses the
dev app locally and the production app once deployed, without any code change. A new Strava app is
limited to one athlete until Strava reviews it: fine for dev, required for production before opening
to other users.

## Local setup

1. Create the **dev** Strava app (callback domain `localhost`), see above.
2. Create `.dev.vars` from `.dev.vars.example` with the dev app's client id and secret
   (`TOKEN_KEY`: `openssl rand -base64 32`).
3. Create the D1 database and copy its `database_id` into `wrangler.jsonc`:
   ```sh
   pnpm wrangler d1 create ofolam
   ```
4. Create the KV namespace (cache of Strava responses) and copy its `id` into `wrangler.jsonc`:
   ```sh
   pnpm wrangler kv namespace create CACHE
   ```
5. Install and initialise:
   ```sh
   pnpm install
   pnpm db:migrate:local
   pnpm dev
   ```

## Deployment

First deployment, from your machine (the CI takes over afterwards):

1. Create the **production** Strava app (callback domain = your domain) and put its client id in
   `wrangler.jsonc` → `vars.STRAVA_CLIENT_ID`.
2. Set the worker secrets once (they persist across deployments):
   ```sh
   pnpm wrangler secret put STRAVA_CLIENT_SECRET   # production app secret
   pnpm wrangler secret put TOKEN_KEY              # never change it afterwards: it encrypts stored tokens
   ```
3. Apply the schema and deploy:
   ```sh
   pnpm db:migrate:remote
   pnpm run deploy
   ```

## Continuous deployment

`.github/workflows/deploy.yml` runs `pnpm lint` and `pnpm build` on every pull request towards `main`,
and deploys on every push to `main` (migrations, then `wrangler deploy`). It needs, in the repository
settings:

- Secrets: `CLOUDFLARE_API_TOKEN` (token with the "Edit Cloudflare Workers" template plus D1 edit),
  `CLOUDFLARE_ACCOUNT_ID`.
- Variables (optional, bundled into the client): `VITE_COFFEE_URL`, `VITE_LEGAL_NAME`,
  `VITE_CONTACT_EMAIL`, `VITE_TILES_LIGHT`, `VITE_TILES_DARK`, `VITE_TILES_ATTRIBUTION`.

Worker secrets (`STRAVA_CLIENT_SECRET`, `TOKEN_KEY`) are not handled by the workflow: set them once
with `pnpm wrangler secret put`, they persist across deployments.

## Map tiles (Stadia Maps)

The "Map" background fetches raster tiles from Stadia Maps. On `localhost` no account is needed. In
production, Stadia authenticates requests by the domain they come from, so the deployed app must be
registered once:

1. Create a free account at https://stadiamaps.com (the free tier is for non-commercial use; it is
   enough for a personal project and shows no watermark).
2. In the dashboard, create a property and add your domain (e.g. `ofolam.com`, plus `www.ofolam.com`
   if you serve it) under *Authentication → Domains*. Tiles requested from any other origin are
   refused.
3. Nothing to change in the app: the default tile URLs in `src/lib/tiles.ts` carry no key. If you
   prefer key-based auth (or another provider), set `VITE_TILES_LIGHT`, `VITE_TILES_DARK` and
   `VITE_TILES_ATTRIBUTION` in `.env` and in the GitHub variables; see `.env.example` for a MapTiler
   example.

If the map stays blank in production while it works locally, the domain is almost certainly missing
from the Stadia property.

## Debugging Strava responses

To see exactly what Strava returns, set `DEBUG_STRAVA=1` in `.dev.vars` and restart `pnpm dev`. Every
raw response is then kept for 24 h in the local KV namespace under a `debug:strava:` key, and a one-line
summary is printed in the dev server console.

```sh
pnpm debug:strava                                  # list the captured responses
pnpm debug:strava:get "debug:strava:<athleteId>:/activities/123"   # print one of them
```

The flag is read from the worker environment only; never set it in production (`wrangler.jsonc` vars
or secrets), the cached responses would consume KV storage for nothing.

## D1 migrations

The schema lives in `migrations/*.sql` and is applied by Wrangler's migration system
(it records the files already applied in a `d1_migrations` table).

```sh
pnpm db:migrate <name>         # creates migrations/000N_<name>.sql, to fill in
pnpm db:migrate:local          # applies pending migrations locally
pnpm db:migrate:remote         # same, in production
```

Never edit a migration that has been applied: add a new one instead.

## How it works

**Providers.** Sign-in and activities go through a provider interface (`worker/providers/types.ts`);
Strava is the only implementation today (`worker/providers/strava.ts`), Garmin & co can be added as
new entries of the registry (`worker/providers/index.ts`). Athletes are keyed by `(provider, id)`, and
each session remembers its provider, so `/api/activities` always asks the right one.

**Cookie-less OAuth.** The PWA generates a `state`, keeps it in localStorage and navigates to
`/api/auth/<provider>/start` (e.g. `/api/auth/strava/start`). On the callback, the Worker binds a session token to that `state`.
The PWA then claims it through `POST /api/auth/claim` (on load and whenever it comes back to the
foreground). This works around the iOS in-app browser used in standalone mode, which does not
share storage with the PWA.

**Tokens.** Access and refresh tokens are encrypted with AES-GCM in D1 and refreshed automatically
2 minutes before they expire. Sessions are stored hashed (SHA-256).

**Cache.** The Worker stores Strava responses in KV (activity list: 5 min, single activity: 24 h)
to stay under the API quotas (200 requests / 15 min, 2,000 / day, across all users).
The PWA also keeps the first page and every opened activity in localStorage: they show up
instantly on launch, then refresh in the background (`src/lib/cache.ts`).

**Languages.** English and French (`src/i18n/`). Priority: `ofolam.lang` cookie (switcher) > country
of the Strava profile (the API does not expose a language, so `fr` is inferred from French-speaking
countries) > English. Worker errors are codes (`rate_limited`, `invalid_session`, …) translated by
the PWA.

**Theme.** Light, dark or system, stored in localStorage (`src/theme.tsx`). Semantic color roles are
defined once in `src/index.css` and redefined for the dark theme; the exported image is unaffected.

**Rendering.** 100% client-side, on a canvas (`src/lib/render.ts`). Formats: story 1080×1920,
post 1080×1350, square 1080×1080, landscape 1920×1080. The Strava polyline is decoded and projected
in Web Mercator (`src/lib/polyline.ts`). The editor lets you move, resize and stack the route and
every text block, style texts (font, color, size), align a multi-selection, crop a background photo,
and undo/redo (`src/components/Editor.tsx`). The last used settings (background, format, elements,
styles, …) are remembered in localStorage and applied to the next activity.

**Multisport events.** Back-to-back activities (next start within 10 min of the previous end, e.g.
swim → T1 → bike → T2 → run) are grouped client-side into one event (`src/lib/multisport.ts`): a
single row in the list, unfoldable into its legs, labelled triathlon / duathlon / swim & run /
aquabike from the sport sequence. Its card draws every leg's route in its own color on a shared
projection, the total time (transitions included) and one compact line per leg; distance, pace and
elevation are not shown for an event. Each leg can still be opened on its own.

**Templates.** The "Fond" tab starts with a strip of live thumbnails: the current activity drawn
with each template. Built-in templates ship with the app (`src/lib/templates.ts`); personal ones are
saved in D1 per athlete (`templates` table, `/api/templates`, 20 max) and cached locally. A template
is a layout: elements, positions, styles. The format and the background are chosen separately and
never change when a template is applied; the photo crop and a custom title are not part of it either.
The strip shows the base layouts and the personal templates; a "More" button opens a dialog with
variations of the base layouts (route color picked up by the stats, text sizes, fonts), generated in
`src/lib/templates.ts`.

**Map background.** The "Map" background draws raster tiles in the exact projection of the route
(`src/lib/tiles.ts`): the map follows the route's box. Default provider: Stadia Maps (OpenStreetMap
data, free for non-commercial use; see "Map tiles" above for the required domain registration). Another provider can be set through `VITE_TILES_*` in `.env` (see `.env.example`, with a
MapTiler example). The provider must send CORS headers: tiles are loaded with `crossOrigin` so the
canvas stays exportable. Showing a map sends the route's area to the tile server.

**Legal pages.** Privacy policy, terms of use and legal notice (`src/legal/`, English + French),
served on the hash routes `#/privacy`, `#/terms`, `#/legal` and linked under the sign-in button.
The publisher name and contact email come from `VITE_LEGAL_NAME` and `VITE_CONTACT_EMAIL`.

**Sharing.**
- *Share*: Web Share API, opens the native sheet (Instagram, WhatsApp, …). The blob is computed ahead
  of time so `navigator.share` runs directly inside the click handler (a Safari requirement).
- *Copy sticker*: Clipboard API, to paste into the Instagram story editor.
- *Download*: desktop fallback.

## Before opening to other users

- A new Strava app is limited to 1 athlete: request a review from Strava.
- Brand guidelines: the sign-in button and the "Powered by Strava" logo are the official Strava assets
  (`public/strava/`), used unmodified. Keep them that way.
- Test the OAuth flow in installed mode on a real iPhone.

## Structure

```
worker/        Hono API (OAuth, sessions, KV cache) and providers/ (Strava today)
src/lib/       api, cache, polyline, formats, canvas rendering, map tiles, sharing
src/i18n/      dictionaries and language switcher
src/components Login, ActivityList, Editor and its panels (overlay, cropper, color/text style…)
migrations/    D1 schema, one SQL file per migration
```

## License

GNU AGPL v3 (`LICENSE`). You may use, modify and self-host Ofolam, including commercially, but any
modified version you run as a service must make its complete source code available to its users
under the same license. "Ofolam" and its logo are not covered by this license.
