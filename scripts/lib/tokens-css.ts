// Turns the copied design tokens in src/theme into CSS custom properties.
// The TypeScript files stay the source of truth. Run `bun run tokens` after a
// sync, and never edit src/styles/tokens.css by hand.

import { colors, palette } from "../../src/theme/colors";
import { spacing, touch, layout } from "../../src/theme/spacing";
import { radius, shadow, motion } from "../../src/theme/radius";
import { fontSize, leading, letterSpacing, weight } from "../../src/theme/typography";

type Leaf = string | number;
type Tree = { readonly [key: string]: Leaf | Tree };

export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
}

export interface MotionToken {
  durationFast: number;
  durationBase: number;
  durationSlow: number;
  easeStandard: readonly number[];
  easeOut: readonly number[];
}

/** Everything the generator reads. Tests pass a changed copy; the app uses CURRENT_THEME. */
export interface TokenTheme {
  palette: Tree;
  colors: Tree;
  spacing: Tree;
  touch: Tree;
  layout: Tree;
  radius: Tree;
  fontSize: Tree;
  weight: Tree;
  leading: Tree;
  letterSpacing: Tree;
  motion: MotionToken;
  shadow: Record<string, ShadowToken>;
}

export const CURRENT_THEME: TokenTheme = {
  palette,
  colors: colors as unknown as Tree,
  spacing,
  touch,
  layout,
  radius,
  fontSize,
  weight,
  leading,
  letterSpacing,
  motion,
  shadow,
};

/** Browsers use 16px for 1rem. Font sizes are emitted in rem so users' text-size settings still apply. */
const ROOT_FONT_PX = 16;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SPACING_KEY = /^s\d+$/;

/** camelCase or digit-suffixed keys become kebab-case: textStrong -> text-strong, blue50 -> blue-50. */
function kebab(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([a-z])(\d)/g, "$1-$2")
    .toLowerCase();
}

/** Adds a variable, and throws if another token already produced the same name. */
function put(out: Map<string, string>, name: string, value: string): void {
  if (out.has(name)) {
    throw new Error(`Duplicate CSS variable ${name}. Two tokens normalise to the same name.`);
  }
  out.set(name, value);
}

function flatten(
  tree: Tree,
  prefix: string,
  out: Map<string, string>,
  toValue: (leaf: Leaf) => string,
): void {
  for (const [key, value] of Object.entries(tree)) {
    const name = `${prefix}-${kebab(key)}`;
    if (typeof value === "string" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error(`Token ${name} is not a finite number: ${value}`);
      }
      put(out, `--${name}`, toValue(value));
    } else if (typeof value === "object" && value !== null) {
      flatten(value, name, out, toValue);
    } else {
      throw new Error(`Token ${name} has no usable value`);
    }
  }
}

const px = (leaf: Leaf): string => (typeof leaf === "number" ? `${leaf}px` : leaf);

const rem = (leaf: Leaf): string => {
  if (typeof leaf !== "number") {
    return leaf;
  }
  return `${leaf / ROOT_FONT_PX}rem`;
};

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function cubicBezier(points: readonly number[]): string {
  if (points.length !== 4 || points.some((point) => !Number.isFinite(point))) {
    throw new Error(`Easing must be four finite numbers, got: ${points.join(", ")}`);
  }
  return `cubic-bezier(${points.join(", ")})`;
}

function boxShadow(entry: ShadowToken): string {
  if (!HEX_COLOR.test(entry.shadowColor)) {
    throw new Error(`Shadow colour must be #rrggbb, got: ${entry.shadowColor}`);
  }
  const [r, g, b] = hexToRgb(entry.shadowColor);
  // RN's shadowRadius is roughly half the CSS blur radius, so double it.
  const blur = entry.shadowRadius * 2;
  return `${entry.shadowOffset.width}px ${entry.shadowOffset.height}px ${blur}px rgba(${r}, ${g}, ${b}, ${entry.shadowOpacity})`;
}

export function buildTokensCss(theme: TokenTheme = CURRENT_THEME): string {
  const vars = new Map<string, string>();

  flatten(theme.palette, "palette", vars, (leaf) => String(leaf));
  flatten(theme.colors, "color", vars, (leaf) => String(leaf));
  for (const [key, value] of Object.entries(theme.spacing)) {
    if (!SPACING_KEY.test(key) || typeof value !== "number") {
      throw new Error(`Spacing token ${key} must be a number under a key like s4`);
    }
    put(vars, `--space-${key.slice(1)}`, px(value));
  }
  flatten(theme.touch, "touch", vars, px);
  flatten(theme.layout, "layout", vars, px);
  flatten(theme.radius, "radius", vars, px);
  flatten(theme.fontSize, "font-size", vars, rem);
  flatten(theme.weight, "font-weight", vars, String);
  flatten(theme.leading, "leading", vars, String);
  flatten(theme.letterSpacing, "tracking", vars, String);
  put(vars, "--motion-duration-fast", `${theme.motion.durationFast}ms`);
  put(vars, "--motion-duration-base", `${theme.motion.durationBase}ms`);
  put(vars, "--motion-duration-slow", `${theme.motion.durationSlow}ms`);
  put(vars, "--motion-ease-standard", cubicBezier(theme.motion.easeStandard));
  put(vars, "--motion-ease-out", cubicBezier(theme.motion.easeOut));

  for (const [key, entry] of Object.entries(theme.shadow)) {
    put(vars, `--shadow-${kebab(key)}`, boxShadow(entry));
  }

  const lines = [...vars].map(([name, value]) => `  ${name}: ${value};`);
  return [
    "/* Generated from src/theme by scripts/build-tokens.ts. Do not edit by hand. */",
    ":root {",
    ...lines,
    "}",
    "",
  ].join("\n");
}
