/// <reference types="vite/client" />

declare module '*.json' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: Record<string, any>;
  export default value;
}

interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
