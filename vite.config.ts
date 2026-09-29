import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
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
        // Indispensable : sinon le service worker intercepte /api/auth/start
        // et sert index.html au lieu de rediriger vers Strava
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: "Trace",
        short_name: "Trace",
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
