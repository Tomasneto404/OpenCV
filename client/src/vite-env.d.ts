/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Umami website id. When unset, no analytics script is loaded at all. */
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  /** Umami script URL. Defaults to https://analytics.cveaver.com/script.js. */
  readonly VITE_UMAMI_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
