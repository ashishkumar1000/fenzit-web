# fenzit-web — agent rules

Full standard: `../../../../docs/repos/fenzit-web/standards.md`. Read it before a new screen, a new dependency, or an API client. Where this file and that one disagree, stop and ask.

## Rules that always apply

- **Bun only.** `bun install`, `bun run <script>`, `bunx <pkg>`. Never npm, yarn, or pnpm. Never commit `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`. `bun.lock` is committed here.
- **Exact pins, two-week rule.** No `^` or `~`. A new package must be at least two weeks old, and it must be listed in the standard's stack table first.
- **main only.** No branches.
- **No commit or push without consent.** A push deploys to fenzit.com, so treat it as outward-facing.
- **BMAD review before commit.** Run `/bmad-code-review`, not `/code-review`.
- **Order:** implement, user confirms, then tests, then review, then commit.
- **Backend first.** An additive BE change deploys before this app. A breaking BE change follows the three-step rule in the standard.
- **Never trust the client.** Only the user's own token reaches the browser. No service key, no secret in `VITE_*` values.
- **Branch on `error_code`, never on `message` text.** Map codes to plain-English copy in one place (`src/utils/errorMessages.ts`). Screens show `messageForError(error)`, never `error.message`. A `204` call is typed `apiFetch<void>`. An empty `200` is an error.
- **Every screen has loading, error, and empty states.** Every request has a timeout.
- **CSS Modules, strictly** (user rule, 2026-10-19). Every component file has a paired `<Name>.module.css`, imported as `import styles from "./Name.module.css"` and used as `className={styles.name}`. No string class names. No element selectors in modules. `global.css` only holds tokens, the reset, and the page background. `bun run check:styles` enforces the pairing.
- **Icons come from `lucide-react`**, the same library as the mobile app (`lucide-react-native`). Pinned to the app's version. Never draw an icon by hand. Raw SVG is fine for graphics that are not icons.
- **No `any`.** Components, props, hooks, and API calls are explicitly typed. Prefer `unknown` and narrow it.
- **No TanStack Query.** Server data loads in React Router loaders (`src/app/router.tsx`, `features/<name>/loaders.ts`), and changes go through actions. Never fetch in `useEffect`. Lint rejects `useEffect` in `features/` and `pages/`.
- **State separation.** Local UI state uses `useState` or `useReducer`. Server data is never copied into local state.
- **Design from tokens.** No raw hex, spacing, or radius values in components. Use the CSS variables from `src/styles/tokens.css` (generated from `src/theme`). Never edit `src/theme/` or `tokens.css` here. Change the design system in `fenzit-app`, then run `bun run sync:design-system` and `bun run tokens`. Brand rules: `src/theme/DESIGN_SYSTEM.md`.
- **Plain English UI copy.** Sentence case. Disabled controls say why.
- **Responsive, every screen.** Works in a desktop browser and in mobile web. Mobile first, with `min-width` media queries. Check at 360, 390, 768, and 1280 px with no horizontal scroll. Inputs use 16 px text. Use `100dvh`, not `100vh`. Tap only: no hover-only controls. Respect safe-area insets. Standard §5 has the full rule.
- **Feature-first layout.** Feature code lives in `src/features/<name>/`. Shared code (`components/`, `hooks/`, `services/`, `config/`, `utils/`, `types/`) never imports from `features/`, `pages/`, or `app/`. Lint enforces this. Move code down into shared only when a second feature needs it.
- **No barrel `index.ts` re-exports.** Import the file directly.
- **Tests run with Bun.** `bun run test` runs `bun test`. Preloads in `bunfig.toml` set up happy-dom and React Testing Library. Add the matcher types in `src/testing/bun-test.d.ts` when a new jest-dom matcher is first used. Do not add Vitest or Jest.
- **Toolchain:** `typecheck` and `build` use `tsc` 7. Lint runs on the `typescript` 6.0.3 package, because typescript-eslint does not support TS 7 yet. Do not change either without reading standard §2a.
- **Keep files under about 300 lines.**
- **Test as a QA engineer.** Cover boundaries, failure paths, and permissions. Never weaken an assertion to match the code.
- **Indian English in replies.** Plain English, no Hindi words mixed in.
