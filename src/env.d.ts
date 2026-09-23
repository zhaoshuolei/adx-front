/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_LENOVO_AUTH_URL?: string
  readonly VITE_LENOVO_CLIENT_ID?: string
  readonly VITE_LENOVO_SCOPE?: string
  readonly VITE_LENOVO_RESPONSE_TYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
