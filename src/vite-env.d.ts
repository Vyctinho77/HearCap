/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TV_DATAFEED_URL?: string;
  readonly VITE_TV_CHARTING_LIBRARY_SRC?: string;
  readonly VITE_TV_DATAFEED_BUNDLE_SRC?: string;
  readonly VITE_TV_FALLBACK_SYMBOL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

