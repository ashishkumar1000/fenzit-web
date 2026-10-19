import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkComponentStyles } from "./css-modules-check";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "css-modules-check-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(relativePath: string, text = ""): void {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
}

/** A component that follows the rule: a paired stylesheet and the exact import line. */
function writeCompliant(name: string, folder = "components"): void {
  write(`${folder}/${name}.tsx`, `import styles from "./${name}.module.css";\n`);
  write(`${folder}/${name}.module.css`, ".root {}\n");
}

describe("checkComponentStyles", () => {
  it("passes a component with a paired stylesheet and the exact import", () => {
    writeCompliant("Button");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result).toEqual({ checked: 1, problems: [] });
  });

  it("reports a component with no paired stylesheet", () => {
    write("components/Button.tsx", `import styles from "./Button.module.css";\n`);

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toEqual([
      `${join(root, "components/Button.tsx")}: no paired Button.module.css`,
    ]);
  });

  it("reports a component that does not import its styles", () => {
    write("components/Button.tsx", "export const Button = 1;\n");
    write("components/Button.module.css", ".root {}\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('import styles from "./Button.module.css";');
  });

  it.each([
    ["a different binding name", 'import s from "./Button.module.css";'],
    ["single quotes", "import styles from './Button.module.css';"],
    ["a different stylesheet", 'import styles from "./Card.module.css";'],
    ["a missing semicolon", 'import styles from "./Button.module.css"'],
    ["a commented-out import", '// import styles from "./Button.module.css";'],
    [
      "an import inside a block comment on one line",
      '/* import styles from "./Button.module.css"; */',
    ],
  ])("rejects the import when it is %s", (_label, line) => {
    write("components/Button.tsx", `${line}\n`);
    write("components/Button.module.css", ".root {}\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toHaveLength(1);
  });

  it("accepts the import line with leading indentation or trailing spaces", () => {
    write("components/Button.tsx", '  import styles from "./Button.module.css";   \n');
    write("components/Button.module.css", ".root {}\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toEqual([]);
  });

  it("does not require a stylesheet for test files", () => {
    writeCompliant("Button");
    write("components/Button.test.tsx", "export {};\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result).toEqual({ checked: 1, problems: [] });
  });

  it("ignores non-component files such as hooks and utilities", () => {
    writeCompliant("Button");
    write("components/useThing.ts", "export {};\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result).toEqual({ checked: 1, problems: [] });
  });

  it("checks components in nested folders", () => {
    write("features/landing/components/Hero.tsx", "export {};\n");

    const result = checkComponentStyles([join(root, "features")]);

    expect(result.checked).toBe(1);
    expect(result.problems).toEqual([
      `${join(root, "features/landing/components/Hero.tsx")}: no paired Hero.module.css`,
    ]);
  });

  it("fails when a root folder does not exist, instead of passing with fewer files checked", () => {
    writeCompliant("Button");

    const result = checkComponentStyles([join(root, "components"), join(root, "pages")]);

    expect(result.checked).toBe(1);
    expect(result.problems).toEqual([
      `${join(root, "pages")}: folder not found. Update the component roots in check-css-modules.ts`,
    ]);
  });

  it("fails when every folder exists but holds no component files", () => {
    write("components/useThing.ts", "export {};\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.checked).toBe(0);
    expect(result.problems).toEqual(["No component files were found, so nothing was checked."]);
  });

  it("fails when the import is inside a multi-line block comment", () => {
    write(
      "components/Button.tsx",
      '/*\nimport styles from "./Button.module.css";\n*/\nexport const Button = 1;\n',
    );
    write("components/Button.module.css", ".root {}\n");

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain("must import its styles");
  });

  it("accepts the import when a block comment sits elsewhere in the file", () => {
    write(
      "components/Button.tsx",
      '/* header\n   notes */\nimport styles from "./Button.module.css";\n',
    );
    write("components/Button.module.css", ".root {}\n");

    expect(checkComponentStyles([join(root, "components")]).problems).toEqual([]);
  });

  it("treats a folder named like the stylesheet as a missing stylesheet", () => {
    write("components/Button.tsx", 'import styles from "./Button.module.css";\n');
    mkdirSync(join(root, "components/Button.module.css"));

    const result = checkComponentStyles([join(root, "components")]);

    expect(result.problems).toEqual([
      `${join(root, "components/Button.tsx")}: no paired Button.module.css`,
    ]);
  });

  it("counts every checked component, and reports every problem, not only the first", () => {
    writeCompliant("Button");
    write("components/Card.tsx", "export {};\n");
    write("pages/HomePage.tsx", "export {};\n");

    const result = checkComponentStyles([join(root, "components"), join(root, "pages")]);

    expect(result.checked).toBe(3);
    expect(result.problems).toHaveLength(2);
  });
});
