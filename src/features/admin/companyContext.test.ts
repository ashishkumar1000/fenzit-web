import { describe, expect, it } from "bun:test";
import { NoCompanySelectedError } from "../../services/api";
import {
  activeCompanyFrom,
  companyScopedHeaders,
  isCompanyId,
  searchWithCompany,
} from "./companyContext";
import type { DossierMembership } from "./dossier-types";

const A = "11111111-2222-4333-8444-555555555555";
const B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function membership(companyId: unknown, company = "Co"): DossierMembership {
  return {
    companyId: companyId as string,
    company,
    role: "owner",
    status: "active",
    employeeCode: null,
    invitedBy: null,
    joined: null,
  } as DossierMembership;
}

describe("isCompanyId: what counts as a company id", () => {
  it.each([A, A.toUpperCase(), B])("accepts a UUID: %s", (value) => {
    expect(isCompanyId(value)).toBe(true);
  });

  it.each([
    ["empty string", ""],
    ["UUID without hyphens", A.replace(/-/g, "")],
    ["UUID with braces", `{${A}}`],
    ["UUID with a space around it", ` ${A} `],
    ["one character too short", A.slice(0, -1)],
    ["one character too long", `${A}0`],
    ["non-hex letter", A.replace("1", "z")],
    ["plain words", "not-a-uuid"],
    ["script tag", "<script>alert(1)</script>"],
    ["null", null],
    ["a number", 12345],
    ["an object", { id: A }],
  ])("refuses %s", (_label, value) => {
    expect(isCompanyId(value)).toBe(false);
  });
});

describe("activeCompanyFrom: the company picked in the URL", () => {
  it("returns null when the URL has no company param", () => {
    expect(activeCompanyFrom(new URLSearchParams("phone=1"), [membership(A)])).toBeNull();
  });

  it("returns null when the param is not a UUID, even if a membership matches its text", () => {
    expect(activeCompanyFrom(new URLSearchParams("company=bad"), [membership("bad")])).toBeNull();
  });

  it("returns null for a valid UUID that is not one of this person's companies", () => {
    expect(activeCompanyFrom(new URLSearchParams(`company=${B}`), [membership(A)])).toBeNull();
  });

  it("returns the id in lower case when an upper-case id matches a membership", () => {
    const params = new URLSearchParams(`company=${A.toUpperCase()}`);
    expect(activeCompanyFrom(params, [membership(A)])).toBe(A);
  });

  it("ignores a membership with no company id, so it can never become the active company", () => {
    expect(activeCompanyFrom(new URLSearchParams(`company=${A}`), [membership(null)])).toBeNull();
    expect(activeCompanyFrom(new URLSearchParams(`company=${A}`), [membership("")])).toBeNull();
  });

  it("returns null when this person has no companies at all", () => {
    expect(activeCompanyFrom(new URLSearchParams(`company=${A}`), [])).toBeNull();
  });
});

describe("companyScopedHeaders: the header on every staff company call", () => {
  it("sends the company id as X-Company-Id when one is picked", () => {
    expect(companyScopedHeaders(A)).toEqual({ "X-Company-Id": A });
  });

  it("throws before any request when no company is picked, so no call goes out without the header", () => {
    expect(() => companyScopedHeaders(null)).toThrow(NoCompanySelectedError);
  });
});

describe("searchWithCompany: the URL after a pick or a clear", () => {
  it("adds the company to an empty search", () => {
    expect(searchWithCompany("", A)).toBe(`?company=${A}`);
  });

  it("keeps the other params and replaces an earlier company", () => {
    const result = searchWithCompany(`?phone=9876&company=${B}&dialCode=%2B91`, A);
    const params = new URLSearchParams(result);
    expect(params.get("phone")).toBe("9876");
    expect(params.get("dialCode")).toBe("+91");
    expect(params.getAll("company")).toEqual([A]);
  });

  it("removes only the company param when cleared, and leaves no stray question mark", () => {
    expect(searchWithCompany(`?company=${A}`, null)).toBe("");
    expect(searchWithCompany(`?phone=1&company=${A}`, null)).toBe("?phone=1");
  });

  it("leaves a search with no company param unchanged when cleared", () => {
    expect(searchWithCompany("?phone=1", null)).toBe("?phone=1");
  });
});
