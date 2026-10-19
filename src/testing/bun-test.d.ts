// Types for the jest-dom matchers used in tests, on bun:test's expect().
// jest-dom's own types target Jest and Vitest, and extending them into bun:test
// does not merge (jest-dom issues #674 and #744). So the matchers the suite uses
// are declared here by hand. The runtime still provides every jest-dom matcher.
declare module "bun:test" {
  // T must stay: merging needs the same type-parameter list as bun:test.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<T = unknown> {
    toBeInTheDocument(): void;
    toHaveAttribute(name: string, value?: unknown): void;
    toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): void;
  }
}

export {};
