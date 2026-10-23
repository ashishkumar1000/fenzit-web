import { afterEach, describe, expect, it } from "bun:test";
import { breakStorage, restoreStorage } from "../testing/brokenStorage";
import { clearSession, readSession, SESSION_KEY, writeSession } from "./session";

afterEach(() => {
  restoreStorage();
  window.localStorage.clear();
});

describe("readSession", () => {
  it("returns null when nothing is stored", () => {
    expect(readSession()).toBeNull();
  });

  it("round-trips the token and the name it stored", () => {
    writeSession({ token: "tok-1", name: "Ravi Kumar" });

    expect(readSession()).toEqual({ token: "tok-1", name: "Ravi Kumar" });
  });

  it("stores a null name as null, not as the string 'null'", () => {
    writeSession({ token: "tok-1", name: null });

    expect(readSession()).toEqual({ token: "tok-1", name: null });
  });

  it("returns null for an empty token, because an empty token means signed out", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: "", name: "Ravi" }));

    expect(readSession()).toBeNull();
  });

  it("returns null for a token that is not a string", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ token: 42, name: "Ravi" }));

    expect(readSession()).toBeNull();
  });

  it("returns null for stored text that is not JSON", () => {
    window.localStorage.setItem(SESSION_KEY, "{not json");

    expect(readSession()).toBeNull();
  });

  it("returns null when the stored value is not an object", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify("tok-1"));

    expect(readSession()).toBeNull();
  });

  it("returns null when the stored object has no token", () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ name: "Ravi" }));

    expect(readSession()).toBeNull();
  });

  it("never hands back a role, even if one got into storage", () => {
    // The web login spec: the role comes from GET /users/me, never from storage.
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: "tok-1", name: "Ravi", role: "company_admin", platformAdmin: true }),
    );

    expect(readSession()).toEqual({ token: "tok-1", name: "Ravi" });
  });

  it("returns null when the browser refuses the read, even with a sign-in saved", () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    breakStorage("getItem");

    expect(readSession()).toBeNull();
  });
});

describe("writeSession", () => {
  it("reports success after saving", () => {
    expect(writeSession({ token: "tok-1", name: null })).toBe(true);
    expect(readSession()).toEqual({ token: "tok-1", name: null });
  });

  it("overwrites the previous sign-in", () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    writeSession({ token: "tok-2", name: null });

    expect(readSession()).toEqual({ token: "tok-2", name: null });
  });

  it("reports failure when the browser refuses the write, and stores nothing", () => {
    breakStorage("setItem");

    expect(writeSession({ token: "tok-1", name: null })).toBe(false);

    restoreStorage();
    expect(readSession()).toBeNull();
  });
});

describe("clearSession", () => {
  it("removes the saved sign-in", () => {
    writeSession({ token: "tok-1", name: "Ravi" });

    clearSession();

    expect(readSession()).toBeNull();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("does nothing and does not throw when nothing is stored", () => {
    expect(() => clearSession()).not.toThrow();
  });

  it("swallows a refused remove", () => {
    writeSession({ token: "tok-1", name: "Ravi" });
    breakStorage("removeItem");

    expect(() => clearSession()).not.toThrow();
  });
});
