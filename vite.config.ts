import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tests run with `bun test`. Its config lives in bunfig.toml, not here.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  // Local dev only. Run with VITE_API_BASE_URL=http://localhost:5173 so the browser calls
  // this origin, and Vite forwards /api to the live fenzit-be (which does not allow localhost).
  server: {
    proxy: {
      "/api": { target: "https://api.fenzit.com", changeOrigin: true },
    },
  },
});
