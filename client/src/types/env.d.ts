interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_STORAGE_URL?: string;
  readonly VITE_N8N_SALES_ANALYSIS_WEBHOOK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
