import { describe, expect, it } from "bun:test";
import { palette } from "../../src/theme/colors";
import { shadow, motion } from "../../src/theme/radius";
import { spacing } from "../../src/theme/spacing";
import { fontSize } from "../../src/theme/typography";
import { buildTokensCss, CURRENT_THEME, type TokenTheme } from "./tokens-css";

/** The declaration lines for one variable, exactly as they appear in the output. */
function declarationOf(css: string, name: string): string | undefined {
  return css.split("\n").find((line) => line.startsWith(`  ${name}: `));
}

/** A copy of the real theme with one part replaced, so each test breaks one thing. */
function themeWith(changes: Partial<TokenTheme>): TokenTheme {
  return { ...CURRENT_THEME, ...changes };
}

describe("buildTokensCss on the real theme", () => {
  const css = buildTokensCss();

  it("is deterministic: two builds of the same theme match", () => {
    expect(buildTokensCss()).toBe(css);
  });

  it("emits every spacing token from the theme, named by its number", () => {
    for (const [key, value] of Object.entries(spacing)) {
      expect(declarationOf(css, `--space-${key.slice(1)}`)).toBe(
        `  --space-${key.slice(1)}: ${value}px;`,
      );
    }
  });

  it("emits colours with kebab-case names taken from the theme keys", () => {
    expect(declarationOf(css, "--palette-blue-600")).toBe(
      `  --palette-blue-600: ${palette.blue600};`,
    );
    expect(declarationOf(css, "--color-text-strong")).toBeDefined();
  });

  it("doubles each shadow's blur, as the comment in the generator says", () => {
    for (const [key, entry] of Object.entries(shadow)) {
      const [r, g, b] = [
        entry.shadowColor.slice(1, 3),
        entry.shadowColor.slice(3, 5),
        entry.shadowColor.slice(5, 7),
      ].map((hex) => parseInt(hex, 16));
      const expected = `  --shadow-${key}: ${entry.shadowOffset.width}px ${entry.shadowOffset.height}px ${entry.shadowRadius * 2}px rgba(${r}, ${g}, ${b}, ${entry.shadowOpacity});`;
      expect(declarationOf(css, `--shadow-${key}`)).toBe(expected);
    }
  });

  it("writes motion durations in milliseconds and easings as cubic-bezier", () => {
    expect(declarationOf(css, "--motion-duration-fast")).toBe(
      `  --motion-duration-fast: ${motion.durationFast}ms;`,
    );
    expect(declarationOf(css, "--motion-ease-standard")).toBe(
      `  --motion-ease-standard: cubic-bezier(${motion.easeStandard.join(", ")});`,
    );
  });

  it("writes font sizes in rem, so the user's text-size setting still applies", () => {
    expect(declarationOf(css, "--font-size-xs")).toBe(`  --font-size-xs: ${fontSize.xs / 16}rem;`);
    expect(css).not.toMatch(/--font-size-[a-z0-9-]+: \d+px;/);
  });
});

describe("buildTokensCss rejects a theme it cannot turn into valid CSS", () => {
  it("throws when two tokens normalise to the same variable name", () => {
    const theme = themeWith({
      colors: { text: { strong: "#000000" }, textStrong: "#111111" },
    });

    expect(() => buildTokensCss(theme)).toThrow(/Duplicate CSS variable --color-text-strong/);
  });

  it("throws on a null token instead of crashing or emitting it", () => {
    const theme = themeWith({ colors: { textStrong: null as unknown as string } });

    expect(() => buildTokensCss(theme)).toThrow(/Token color-text-strong has no usable value/);
  });

  it("throws on a NaN or infinite number instead of emitting NaNpx", () => {
    expect(() => buildTokensCss(themeWith({ touch: { min: Number.NaN } }))).toThrow(
      /not a finite number/,
    );
    expect(() => buildTokensCss(themeWith({ layout: { gutterMobile: Infinity } }))).toThrow(
      /not a finite number/,
    );
  });

  it("throws on a boolean token", () => {
    const theme = themeWith({ radius: { pill: true as unknown as number } });

    expect(() => buildTokensCss(theme)).toThrow(/has no usable value/);
  });

  it.each(["space4", "s", "4", "sx4"])(
    "throws on a spacing key %s that is not s<number>",
    (key) => {
      const theme = themeWith({ spacing: { [key]: 4 } });

      expect(() => buildTokensCss(theme)).toThrow(/must be a number under a key like s4/);
    },
  );

  it("throws on a spacing value that is not a number", () => {
    const theme = themeWith({ spacing: { s4: "16px" as unknown as number } });

    expect(() => buildTokensCss(theme)).toThrow(/must be a number under a key like s4/);
  });

  it.each(["#fff", "rgba(0, 0, 0, 0.5)", "black", "#00000000"])(
    "throws on a shadow colour %s that is not #rrggbb",
    (color) => {
      const theme = themeWith({
        shadow: { ...shadow, md: { ...shadow.md, shadowColor: color } },
      });

      expect(() => buildTokensCss(theme)).toThrow(/Shadow colour must be #rrggbb/);
    },
  );

  it.each([
    ["three points", [0.2, 0, 1]],
    ["five points", [0.2, 0, 0, 1, 1]],
    ["a NaN point", [0.2, 0, Number.NaN, 1]],
  ])("throws on an easing with %s", (_label, points) => {
    const theme = themeWith({ motion: { ...motion, easeStandard: points } });

    expect(() => buildTokensCss(theme)).toThrow(/Easing must be four finite numbers/);
  });
});
