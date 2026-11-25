import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { InfoTip } from "./InfoTip";
import styles from "./InfoTip.module.css";

afterEach(cleanup);

const LABEL = "How is one day's salary calculated?";

function renderTip(): { button: HTMLElement; tip: HTMLElement; wrap: HTMLElement } {
  render(<InfoTip label={LABEL}>Monthly salary divided by the days worked.</InfoTip>);
  const button = screen.getByRole("button", { name: LABEL });
  const tip = screen.getByRole("tooltip");
  return { button, tip, wrap: button.parentElement as HTMLElement };
}

// bun test stubs CSS module imports to the file path string, so every token
// here is `undefined` and React drops a class attribute built from a lone
// stubbed token. Stringing the token keeps these assertions honest in both
// worlds: a pinned tip carries the token string in its class list while a
// closed one does not, and if bun one day resolves real class names nothing
// changes.
const hasToken = (element: Element, token: string | undefined): boolean =>
  element.classList.contains(String(token));

// happy-dom applies no cascade (the module is stubbed, no stylesheet is
// attached), so computed pointer-events cannot be observed; the class hook the
// stylesheet keys on and the rule text itself are pinned instead.
const openRule = (): string | null =>
  readFileSync(join(import.meta.dir, "InfoTip.module.css"), "utf8").match(
    /\.wrap\.open \.tip\s*\{[^}]*\}/,
  )?.[0] ?? null;

describe("InfoTip: the tooltip", () => {
  it("ships closed: showing is hover/focus CSS alone, so nothing in the DOM marks it open", () => {
    const { wrap } = renderTip();
    expect(hasToken(wrap, styles.open)).toBe(false);
  });

  it("keyboard focus keeps the tip wired by aria-describedby and named by the label", () => {
    const { button, tip } = renderTip();
    fireEvent.focus(button);
    expect(button).toHaveAttribute("aria-describedby", tip.id);
    expect(within(tip).getByText(LABEL)).toBeInTheDocument();
  });

  it("a tap pins the tip open and a second tap closes it", () => {
    const { button, wrap } = renderTip();
    fireEvent.click(button);
    expect(hasToken(wrap, styles.open)).toBe(true);
    fireEvent.click(button);
    expect(hasToken(wrap, styles.open)).toBe(false);
  });

  it("Escape dismisses a pinned tip", () => {
    const { button, wrap } = renderTip();
    fireEvent.click(button);
    expect(hasToken(wrap, styles.open)).toBe(true);
    fireEvent.keyDown(button, { key: "Escape" });
    expect(hasToken(wrap, styles.open)).toBe(false);
  });

  it("a pinned tip is hoverable: closed tips stay click-through, open ones do not", () => {
    expect(readFileSync(join(import.meta.dir, "InfoTip.module.css"), "utf8")).toMatch(
      /pointer-events:\s*none/,
    );
    expect(openRule()).toMatch(/pointer-events:\s*auto/);
  });

  it("hover still re-anchors the tip to the roomier side before it shows", () => {
    const { button, tip, wrap } = renderTip();
    // Park the icon hard against the right edge so the tip must grow leftward.
    wrap.getBoundingClientRect = () => ({ left: 900, right: 913 }) as DOMRect;
    fireEvent.mouseEnter(button);
    expect(hasToken(tip, styles.tipEnd)).toBe(true);
  });

  it("a window resize re-checks the roomier side while the tip can be showing", () => {
    const { tip, wrap } = renderTip();
    wrap.getBoundingClientRect = () => ({ left: 900, right: 913 }) as DOMRect;
    fireEvent(window, new Event("resize"));
    expect(hasToken(tip, styles.tipEnd)).toBe(true);
  });
});
