// Writes src/styles/tokens.css from src/theme. Run with `bun run tokens`.
import { writeFileSync } from "node:fs";
import { buildTokensCss } from "./lib/tokens-css";

writeFileSync("src/styles/tokens.css", buildTokensCss());
console.log("Wrote src/styles/tokens.css");
