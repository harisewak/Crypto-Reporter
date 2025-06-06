/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string
    // more env variables...
    readonly VITE_GIT_COMMIT_HASH?: string
    readonly VITE_BUILD_TIMESTAMP?: string
}
  
interface ImportMeta {
    readonly env: ImportMetaEnv
}
