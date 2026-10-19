import { describe, expect, it } from "bun:test";
import { FLAG_LOADERS } from "./flagLoaders";

describe("FLAG_LOADERS", () => {
  it("has a loader for every two-letter country code", () => {
    for (const code of ["IN", "US", "GB", "AE"]) {
      expect(typeof FLAG_LOADERS[code]).toBe("function");
    }
  });

  it("has no hyphenated subdivision codes, which the package exports under other names", () => {
    const keys = Object.keys(FLAG_LOADERS);
    expect(keys.filter((key) => !/^[A-Z]{2}$/.test(key))).toEqual([]);
    expect(FLAG_LOADERS["GE-AB"]).toBeUndefined();
  });

  it("has no entry for a code that is not a country", () => {
    expect(FLAG_LOADERS["ZZ"]).toBeUndefined();
    expect(FLAG_LOADERS["in"]).toBeUndefined();
  });

  it("every loader resolves to SVG markup", async () => {
    for (const [code, load] of Object.entries(FLAG_LOADERS)) {
      if (load === undefined) throw new Error(`no loader for ${code}`);
      const { default: svg } = await load();
      expect(svg.startsWith("<svg")).toBe(true);
    }
  });
});
