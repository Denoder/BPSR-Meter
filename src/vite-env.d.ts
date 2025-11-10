interface ImportMetaEnv {
    readonly VITE_BPTIMER_DB_URL: string;
    readonly VITE_BPTIMER_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
