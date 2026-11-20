import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error node built-ins used at build time without @types/node
import process from "node:process";
// @ts-expect-error node built-ins used at build time without @types/node
import { readFileSync } from "node:fs";

const host = process.env.TAURI_DEV_HOST;
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || "1.1.0"),
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
        pure_funcs: ["console.log", "console.info", "console.debug", "console.warn"],
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 2000,
  },
}));
