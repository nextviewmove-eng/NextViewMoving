/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, provided in `.env.local`. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
