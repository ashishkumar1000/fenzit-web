// WCAG 2.2 contrast audit of the design system's text pairs. Body and label text
// needs at least 4.5:1 against its background (success criterion 1.4.3).
// Disabled text is exempt by the same criterion, so it is not audited here.
import { describe, expect, it } from "bun:test";
import { colors } from "../theme/colors";

/** WCAG relative luminance of an opaque #rrggbb colour. */
function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Not an opaque #rrggbb colour: ${hex}`);
  }
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 (no contrast) to 21 (black on white). */
function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const MIN_TEXT_RATIO = 4.5;

describe("contrastRatio", () => {
  it("gives 21:1 for black on white, the maximum", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("gives 1:1 for identical colours, the minimum", () => {
    expect(contrastRatio("#2563eb", "#2563eb")).toBeCloseTo(1, 5);
  });

  it("does not depend on which colour is the text", () => {
    expect(contrastRatio("#111827", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#111827"),
      10,
    );
  });

  it("rejects a value that is not an opaque hex colour instead of guessing", () => {
    expect(() => contrastRatio("rgba(0, 0, 0, 0.5)", "#ffffff")).toThrow(/Not an opaque/);
    expect(() => contrastRatio("#fff", "#ffffff")).toThrow(/Not an opaque/);
  });
});

const TEXT_ON_SURFACES: Array<[string, string, string]> = [
  ["textStrong on surfaceCard", colors.textStrong, colors.surfaceCard],
  ["textStrong on surfacePage", colors.textStrong, colors.surfacePage],
  ["textBody on surfaceCard", colors.textBody, colors.surfaceCard],
  ["textBody on surfacePage", colors.textBody, colors.surfacePage],
  ["textBody on surfaceSunken", colors.textBody, colors.surfaceSunken],
  ["textMuted on surfaceCard", colors.textMuted, colors.surfaceCard],
  ["textMuted on surfacePage", colors.textMuted, colors.surfacePage],
  ["textMuted on surfaceSunken", colors.textMuted, colors.surfaceSunken],
  ["textLink on surfaceCard", colors.textLink, colors.surfaceCard],
  ["textLink on surfacePage", colors.textLink, colors.surfacePage],
  ["textOnColor on primary", colors.textOnColor, colors.primary],
  ["onPrimary on primary", colors.onPrimary, colors.primary],
  ["onPrimary on primaryHover", colors.onPrimary, colors.primaryHover],
  ["onPrimary on primaryActive", colors.onPrimary, colors.primaryActive],
];

const STATUS_PAIRS: Array<[string, string, string]> = Object.keys(colors.status).map((key) => {
  const status = colors.status[key as keyof typeof colors.status];
  return [`status ${key} text on its tint`, status.fg, status.bg];
});

describe("design-system text contrast", () => {
  it.each(TEXT_ON_SURFACES)("%s meets 4.5:1", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(MIN_TEXT_RATIO);
  });

  it.each(STATUS_PAIRS)("%s meets 4.5:1", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(MIN_TEXT_RATIO);
  });
});
