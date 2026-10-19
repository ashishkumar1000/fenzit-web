import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tests run with `bun test`. Its config lives in bunfig.toml, not here.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
    // Keep every image as its own hashed file. Small images inlined as data URIs would be
    // repeated in the page HTML, once for src and once for srcset.
    assetsInlineLimit: 0,
  },
  // Local dev only. Run with VITE_API_BASE_URL=http://localhost:5173 so the browser calls
  // this origin, and Vite forwards /api to the live fenzit-be (which does not allow localhost).
  server: {
    proxy: {
      "/api": { target: "https://api.fenzit.com", changeOrigin: true },
    },
  },
});
