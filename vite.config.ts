import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Tests run with `bun test`. Its config lives in bunfig.toml, not here.
export default defineConfig(({ mode }) => {
  // Local dev only. API_PROXY_TARGET (set in .env.local) points /api at a local
  // fenzit-be, e.g. http://localhost:3000. Unset, it uses the live server.
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.API_PROXY_TARGET || "https://api.fenzit.com";
  return {
    plugins: [react()],
    build: {
      outDir: "dist",
      sourcemap: true,
      // Keep every image as its own hashed file. Small images inlined as data URIs would be
      // repeated in the page HTML, once for src and once for srcset.
      assetsInlineLimit: 0,
    },
    // Run with VITE_API_BASE_URL=http://localhost:5173 so the browser calls this origin,
    // and Vite forwards /api to the target. The live fenzit-be does not allow localhost.
    server: {
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
