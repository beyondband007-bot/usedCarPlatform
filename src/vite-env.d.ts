/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONSOLE_STANDALONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
