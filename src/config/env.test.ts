import { describe, expect, it } from "bun:test";
import { resolveApiBaseUrl } from "./env";

describe("resolveApiBaseUrl: missing values", () => {
  it.each([
    ["undefined", undefined],
    ["an empty string", ""],
    ["only spaces", "   "],
    ["only a slash", "/"],
  ])("throws with the fix for %s", (_label, value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow(/not set.*\.env\.example/);
  });
});

describe("resolveApiBaseUrl: accepted values", () => {
  it("returns an https origin unchanged", () => {
    expect(resolveApiBaseUrl("https://api.fenzit.com")).toBe("https://api.fenzit.com");
  });

  it("accepts http with a port, for local development", () => {
    expect(resolveApiBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("removes a single trailing slash", () => {
    expect(resolveApiBaseUrl("https://api.fenzit.com/")).toBe("https://api.fenzit.com");
  });

  it("removes many trailing slashes", () => {
    expect(resolveApiBaseUrl("https://api.fenzit.com///")).toBe("https://api.fenzit.com");
  });

  it("trims surrounding whitespace before it checks", () => {
    expect(resolveApiBaseUrl("  https://api.fenzit.com  ")).toBe("https://api.fenzit.com");
  });

  it("keeps a path prefix", () => {
    expect(resolveApiBaseUrl("https://api.fenzit.com/proxy")).toBe("https://api.fenzit.com/proxy");
  });
});

describe("resolveApiBaseUrl: malformed values fail fast", () => {
  it.each([
    ["a bare host with no scheme", "api.fenzit.com"],
    ["a relative path", "/api/v1"],
    ["a scheme-relative URL", "//api.fenzit.com"],
    ["a non-http scheme", "ftp://api.fenzit.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/plain,hi"],
    ["a scheme with no host", "https://"],
    ["a value with spaces inside", "https://api fenzit.com"],
  ])("throws for %s", (_label, value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow(/VITE_API_BASE_URL must/);
  });

  it("shows the bad value in the message, so the fix is visible", () => {
    expect(() => resolveApiBaseUrl("api.fenzit.com")).toThrow(/got "api\.fenzit\.com"/);
  });
});

describe("resolveApiBaseUrl: transport and URL parts", () => {
  it.each([
    ["a public host over http", "http://api.fenzit.com"],
    ["a private LAN address over http", "http://192.168.1.10:3000"],
    ["a subdomain of localhost over http", "http://api.localhost:3000"],
  ])("rejects %s, because it is cleartext outside localhost", (_label, value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow(/must use https outside localhost/);
  });

  it.each([
    ["127.0.0.1 over http", "http://127.0.0.1:3000"],
    ["localhost over http", "http://localhost:3000"],
  ])("allows %s for local development", (_label, value) => {
    expect(resolveApiBaseUrl(value)).toBe(value);
  });

  it.each([
    ["a query string", "https://api.fenzit.com?debug=1"],
    ["a hash", "https://api.fenzit.com#top"],
    ["a username", "https://user@api.fenzit.com"],
    ["a username and password", "https://user:pass@api.fenzit.com"],
  ])("rejects %s", (_label, value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow(/plain origin/);
  });
});
