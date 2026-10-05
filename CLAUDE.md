# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Context

Ofolam is a PWA that turns a Strava activity into a shareable visual (story, post, sticker).
Single package, no monorepo. See `README.md` for setup, deployment and how the app works.

- **Frontend** (`src/`): Vite + React 19 + Tailwind v4. Rendering is 100% client-side on a canvas
  (`src/lib/render.ts`); the editor UI lives in `src/components/`.
- **API** (`worker/`): Cloudflare Worker with Hono. OAuth with Strava, token refresh, Strava proxy,
  KV cache. Runs inside the Vite dev server through `@cloudflare/vite-plugin`.
- **Storage**: D1 (tokens, sessions, OAuth states), KV (cache of Strava responses).
- **i18n**: `src/i18n/` (English + French). Every user-facing string goes through the dictionaries;
  `fr.ts` is typed against `en.ts`, so a missing key fails the build.

## Commands

```bash
# Package manager: pnpm (not npm/npx). Use `pnpm wrangler …` instead of `npx wrangler …`.
pnpm install               # Install dependencies
pnpm dev                   # Dev server (frontend + worker) on http://localhost:5173
pnpm build                 # Typecheck (tsc -b) + Vite build
pnpm lint                  # Biome (format + lint) + typecheck
pnpm test                  # Unit tests (vitest, node environment, src/**/*.test.ts)
pnpm format                # Apply Biome formatting
pnpm run deploy            # Build + wrangler deploy (`pnpm deploy` alone is a pnpm built-in)

# Database (D1, Wrangler migrations)
pnpm db:migrate <name>     # Create migrations/000N_<name>.sql
pnpm db:migrate:local      # Apply pending migrations locally
pnpm db:migrate:remote     # Apply pending migrations in production
```

Use `pnpm lint` and `pnpm build` rather than calling biome, tsc or vite directly.
Unit tests cover pure logic in `src/lib/` (see `src/lib/tiles.test.ts`); there is no UI test suite.

## Configuration

- `wrangler.jsonc`: worker config, D1 and KV bindings, public vars (`STRAVA_CLIENT_ID`).
- `.dev.vars` (git-ignored): worker secrets for local dev (`STRAVA_CLIENT_SECRET`, `TOKEN_KEY`).
  In production they are set with `pnpm wrangler secret put`.
- `.env` (git-ignored): `VITE_*` variables bundled into the client (map tiles, coffee link).
  Never put a secret there. Declare new ones in `.env.example` and `src/vite-env.d.ts`.

## Formatting & Linting

Biome (`biome.json`): 2-space indent, 110 char line width, double quotes, imports organized automatically.
Buttons need an explicit `type`. Run `pnpm lint` before finishing.

## Code style

- Strict TypeScript. Never use `any` or disable strict mode; use `unknown` + type guards, or better,
  proper types.
- All code comments in English, regardless of the language used in chat.
- Colors: raw palette and semantic roles are declared once in `src/lib/colors.ts` and mirrored in
  `src/index.css` (`@theme`, with dark overrides). Use semantic utilities (`bg-primary`, `text-muted`,
  `border-border`, `bg-surface`…) and the shared component classes (`btn`, `chip`, `seg`, `card`…),
  not hard-coded colors.
- Canvas rendering must stay deterministic: any box reported by `renderCard` must redraw the
  element exactly where it is when fed back as its position (the editor relies on it for dragging).

## Manual testing

There is no automated UI test. `.harness/` (git-ignored) holds a headless Playwright harness that
mounts the editor with a fake Strava API; rebuild it with
`node_modules/.bin/vite build --config .harness/vite.config.ts`, serve `.harness/dist` over HTTP and
drive it with the `run*.mjs` scripts. Useful to check rendering and editor interactions without a
Strava login.

## Changes workflow

After making changes, make sure `pnpm lint` and `pnpm build` pass without errors.
