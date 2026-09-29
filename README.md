# Ofolam

A PWA that turns a Strava activity into a shareable visual (Instagram story or post, transparent sticker).

Stack: Vite + React + Tailwind v4, a Cloudflare Worker (Hono) for the API, D1 for tokens, KV for caching.

## Local setup

1. Create an app at https://www.strava.com/settings/api
   - *Authorization Callback Domain*: `localhost` (your own domain in production)
2. Put your `STRAVA_CLIENT_ID` in `wrangler.jsonc`.
3. Create the D1 database and copy its `database_id` into `wrangler.jsonc`:
   ```sh
   pnpm wrangler d1 create oflm
   ```
4. Create the KV namespace (cache of Strava responses) and copy its `id` into `wrangler.jsonc`:
   ```sh
   pnpm wrangler kv namespace create CACHE
   ```
5. Create `.dev.vars` from `.dev.vars.example` (`TOKEN_KEY`: `openssl rand -base64 32`).
6. Install and initialise:
   ```sh
   pnpm install
   pnpm db:migrate:local
   pnpm dev
   ```

## Deployment

```sh
pnpm wrangler secret put STRAVA_CLIENT_SECRET
pnpm wrangler secret put TOKEN_KEY
pnpm db:migrate:remote
pnpm run deploy
```

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

**Cookie-less OAuth.** The PWA generates a `state`, keeps it in localStorage and navigates to
`/api/auth/start`. On the callback, the Worker binds a session token to that `state`.
The PWA then claims it through `POST /api/auth/claim` (on load and whenever it comes back to the
foreground). This works around the iOS in-app browser used in standalone mode, which does not
share storage with the PWA.

**Tokens.** Access and refresh tokens are encrypted with AES-GCM in D1 and refreshed automatically
2 minutes before they expire. Sessions are stored hashed (SHA-256).

**Cache.** The Worker stores Strava responses in KV (activity list: 5 min, single activity: 24 h)
to stay under the API quotas (200 requests / 15 min, 2,000 / day, across all users).
The PWA also keeps the first page and every opened activity in localStorage: they show up
instantly on launch, then refresh in the background (`src/lib/cache.ts`).

**Languages.** English and French (`src/i18n/`). Priority: `oflm.lang` cookie (switcher) > country
of the Strava profile (the API does not expose a language, so `fr` is inferred from French-speaking
countries) > English. Worker errors are codes (`rate_limited`, `invalid_session`, …) translated by
the PWA.

**Theme.** Light, dark or system, stored in localStorage (`src/theme.tsx`). Semantic color roles are
defined once in `src/index.css` and redefined for the dark theme; the exported image is unaffected.

**Rendering.** 100% client-side, on a canvas (`src/lib/render.ts`). Formats: story 1080×1920,
post 1080×1350, square 1080×1080, landscape 1920×1080. The Strava polyline is decoded and projected
in Web Mercator (`src/lib/polyline.ts`). The editor lets you move, resize and stack the route and
every text block, style texts (font, color, size), align a multi-selection, crop a background photo,
and undo/redo (`src/components/Editor.tsx`).

**Map background.** The "Map" background draws raster tiles in the exact projection of the route
(`src/lib/tiles.ts`): the map follows the route's box. Default provider: Stadia Maps (OpenStreetMap
data, free for non-commercial use, no key on localhost, register your domain on stadiamaps.com in
production). Another provider can be set through `VITE_TILES_*` in `.env` (see `.env.example`, with a
MapTiler example). The provider must send CORS headers: tiles are loaded with `crossOrigin` so the
canvas stays exportable. Showing a map sends the route's area to the tile server.

**Sharing.**
- *Share*: Web Share API, opens the native sheet (Instagram, WhatsApp, …). The blob is computed ahead
  of time so `navigator.share` runs directly inside the click handler (a Safari requirement).
- *Copy sticker*: Clipboard API, to paste into the Instagram story editor.
- *Download*: desktop fallback.

## Before opening to other users

- A new Strava app is limited to 1 athlete: request a review from Strava.
- Brand guidelines: replace the sign-in button and the "Powered by Strava" mention with the official
  assets (see the `TODO`s in `Login.tsx` and `render.ts`).
- Test the OAuth flow in installed mode on a real iPhone.

## Structure

```
worker/        Hono API (OAuth, token refresh, Strava proxy, KV cache)
src/lib/       api, cache, polyline, formats, canvas rendering, map tiles, sharing
src/i18n/      dictionaries and language switcher
src/components Login, ActivityList, Editor and its panels (overlay, cropper, color/text style…)
migrations/    D1 schema, one SQL file per migration
```
