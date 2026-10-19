import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Typed lint rules need a TypeScript version that typescript-eslint supports.
// It does not support TypeScript 7 yet, so these configs stay type-free.

const SHARED_FILES = [
  "src/components/**/*.{ts,tsx}",
  "src/hooks/**/*.{ts,tsx}",
  "src/services/**/*.{ts,tsx}",
  "src/utils/**/*.{ts,tsx}",
  "src/config/**/*.{ts,tsx}",
  "src/types/**/*.{ts,tsx}",
];

const FEATURE_AND_PAGE_FILES = ["src/features/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"];

export default tseslint.config(
  { ignores: ["dist", ".wrangler", "coverage"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Styles come from CSS Modules only: className={styles.name}. A string
      // class name could leak into global styles, so it is an error.
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] > Literal",
          message:
            "Use a CSS Module class instead of a string: className={styles.name}. See the web standard, section 5.",
        },
        {
          // Catches className={"x"} and className={`x`}, which the rule above misses.
          selector:
            "JSXAttribute[name.name='className'] > JSXExpressionContainer > Literal, JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral[expressions.length=0]",
          message:
            "Use a CSS Module class instead of a string: className={styles.name}. See the web standard, section 5.",
        },
      ],
    },
  },
  {
    // Import direction: shared code never reaches up into features, pages, or
    // the app shell. Features and pages may import shared code.
    files: SHARED_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/**", "**/pages/**", "**/app/**"],
              message:
                "Shared code must not import features, pages, or the app shell. Move the code down into shared, or pass it in as props.",
            },
          ],
        },
      ],
    },
  },
  {
    // Server data comes from router loaders (src/app/router.tsx), not from an
    // effect in a component. Local UI state is still fine.
    files: FEATURE_AND_PAGE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              importNames: ["useEffect"],
              message:
                "Do not fetch or sync server data in useEffect. Load it in a router loader, or add a justified eslint-disable with a reason.",
            },
          ],
        },
      ],
      // Also catch React.useEffect when React is imported as a namespace or default.
      "no-restricted-properties": [
        "error",
        {
          object: "React",
          property: "useEffect",
          message:
            "Do not fetch or sync server data in useEffect. Load it in a router loader, or add a justified eslint-disable with a reason.",
        },
      ],
    },
  },
);
