/// <reference types="vite/client" />

// Typed access to the VITE_* variables used by the app (see .env.example)
interface ImportMetaEnv {
  readonly VITE_COFFEE_URL?: string;
  readonly VITE_LOCK_MENTIONS?: string;
  readonly VITE_LEGAL_NAME?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_TILES_LIGHT?: string;
  readonly VITE_TILES_DARK?: string;
  readonly VITE_TILES_ATTRIBUTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
