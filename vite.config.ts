import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { colors } from "./src/lib/colors";

export default defineConfig({
  server: {
    port: 5175,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // Required: otherwise the service worker intercepts /api/auth/start
        // and serves index.html instead of redirecting to Strava
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "Ofolam",
        short_name: "Ofolam",
        description: "Transforme tes activités Strava en visuels à partager.",
        theme_color: colors.secondary,
        background_color: colors.background,
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
