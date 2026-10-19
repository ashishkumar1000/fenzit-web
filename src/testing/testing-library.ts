// Second preload, after happydom.ts. Adds the jest-dom matchers (toBeInTheDocument,
// toHaveTextContent, ...) to bun:test's expect, and unmounts rendered trees after
// each test so one test cannot see another's DOM.
import { afterEach, expect } from "bun:test";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
