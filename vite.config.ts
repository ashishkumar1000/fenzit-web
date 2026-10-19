import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tests run with `bun test`. Its config lives in bunfig.toml, not here.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
