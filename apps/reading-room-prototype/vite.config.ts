import { defineConfig } from "vite";

export default defineConfig({
  // Shared TSX sits outside this app's tsconfig directory. Apply the same transform there.
  esbuild: { jsx: "automatic" },
  build: { modulePreload: { polyfill: false } },
});
