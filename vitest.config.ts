import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests do not boot the Cloudflare and PWA plugins
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
