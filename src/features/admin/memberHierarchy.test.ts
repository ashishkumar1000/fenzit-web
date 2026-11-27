import { describe, expect, it } from "bun:test";
import type { MemberRow } from "./companyApi";
import {
  ADMIN_TOP_LINE,
  chainLine,
  headcountLine,
  inactiveCurrentManager,
  managerCandidates,
  reparentNotice,
  reportsToLine,
  roleMap,
  roleWord,
  sameManager,
  viewerManagerNote,
} from "./memberHierarchy";

// The reporting-tree copy and gates (Epic 24, CAP-6). Every case is a rule the
// server's contract defines — the client only formats it, never guesses it.

function member(overrides: Partial<MemberRow> & Pick<MemberRow, "userId" | "name">): MemberRow {
  return {
    email: null,
    countryCode: "+91",
    phoneNumber: "9800000000",
    employeeCode: `E-${overrides.userId}`,
    role: "employee",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    canCreateJobs: false,
    jobApprovalRequired: false,
    managerId: null,
    managerName: null,
    chain: [],
    headcount: 0,
    directReports: 0,
    ...overrides,
  };
}

const ARJUN = member({ userId: "u-arjun", name: "Arjun", role: "company_admin" });
const PRIYA = member({ userId: "u-priya", name: "Priya" });
const MEERA = member({ userId: "u-meera", name: "Meera" });
const VIKAS = member({ userId: "u-vikas", name: "Vikas", role: "viewer" });
const GONE = member({ userId: "u-gone", name: "Gone", status: "deactivated" });
const MEENA = member({ userId: "u-meena", name: "Meena" });

describe("memberHierarchy: the chain line", () => {
  it("is empty when there is no chain", () => {
    expect(chainLine([], new Map())).toBeNull();
  });

  it("marks the top admin (Owner) and keeps the rest plain", () => {
    const roles = roleMap([ARJUN, PRIYA]);
    expect(
      chainLine(
        [
          { userId: "u-priya", name: "Priya" },
          { userId: "u-arjun", name: "Arjun" },
        ],
        roles,
      ),
    ).toBe("Priya → Arjun (Owner)");
  });

  it("never marks a non-admin branch top as the owner", () => {
    expect(chainLine([{ userId: "u-priya", name: "Priya" }], roleMap([PRIYA]))).toBe("Priya");
  });

  it("degrades to a plain chain when the roster read failed", () => {
    expect(chainLine([{ userId: "u-arjun", name: "Arjun" }], roleMap([]))).toBe("Arjun");
  });

  it("never prints a null name into the chain", () => {
    // `users.name` is nullable, and the wire type says string, so the null can
    // only arrive at run time.
    const nameless = { userId: "u-arjun", name: null } as unknown as {
      userId: string;
      name: string;
    };
    expect(chainLine([nameless], roleMap([ARJUN]))).toBe("Team member (Owner)");
  });
});

describe("memberHierarchy: the Reports-to value", () => {
  it("says Not set when the person has no manager", () => {
    expect(reportsToLine(PRIYA, roleMap([ARJUN]))).toBe("Not set");
  });

  it("shows the chain for a member", () => {
    const withBoss = { ...PRIYA, chain: [{ userId: "u-arjun", name: "Arjun" }] };
    expect(reportsToLine(withBoss, roleMap([ARJUN]))).toBe("Arjun (Owner)");
  });

  it("always puts an admin at the top, whatever the chain says", () => {
    expect(reportsToLine(ARJUN, new Map())).toBe(ADMIN_TOP_LINE);
  });
});

describe("memberHierarchy: the headcount line", () => {
  it("is omitted at zero and for a malformed value", () => {
    expect(headcountLine(0)).toBeNull();
    expect(headcountLine(Number.NaN)).toBeNull();
  });

  it("speaks singular and plural", () => {
    expect(headcountLine(1)).toBe("1 person reports to them");
    expect(headcountLine(3)).toBe("3 people report to them");
  });
});

describe("memberHierarchy: the picker's candidates", () => {
  it("keeps active people, drops the member and their whole subtree", () => {
    const underPriya = { ...MEENA, chain: [{ userId: "u-priya", name: "Priya" }] };
    const candidates = managerCandidates([PRIYA, ARJUN, VIKAS, GONE, underPriya], "u-priya");
    const ids = candidates.map((row) => row.userId);
    expect(ids).toContain("u-arjun");
    expect(ids).toContain("u-vikas");
    expect(ids).not.toContain("u-priya");
    expect(ids).not.toContain("u-gone");
    expect(ids).not.toContain("u-meena");
  });

  it("drops a deeper descendant, not just a direct report", () => {
    const deep = {
      ...MEENA,
      chain: [
        { userId: "u-meera", name: "Meera" },
        { userId: "u-priya", name: "Priya" },
      ],
    };
    expect(managerCandidates([PRIYA, MEERA, deep], "u-priya").map((r) => r.userId)).not.toContain(
      "u-meena",
    );
  });

  it("sorts by display name", () => {
    const sorted = managerCandidates([VIKAS, ARJUN, MEERA], "u-x").map((row) => row.name);
    expect(sorted).toEqual(["Arjun", "Meera", "Vikas"]);
  });

  it("survives a malformed roster", () => {
    expect(managerCandidates([], "u-priya")).toEqual([]);
    expect(managerCandidates(undefined as unknown as MemberRow[], "u-priya")).toEqual([]);
  });
});

describe("memberHierarchy: the stored manager who is no longer active", () => {
  it("is nothing when there is no manager", () => {
    expect(inactiveCurrentManager(null, null, [ARJUN])).toBeNull();
  });

  it("is nothing when the manager is still a candidate", () => {
    expect(inactiveCurrentManager("u-arjun", "Arjun", [ARJUN])).toBeNull();
  });

  it("returns the row so a save cannot silently clear the pointer", () => {
    expect(inactiveCurrentManager("u-gone", "Gone", [ARJUN])).toEqual({
      userId: "u-gone",
      name: "Gone",
    });
  });
});

describe("memberHierarchy: the D13 viewer note", () => {
  it("is shown only for a viewer", () => {
    expect(viewerManagerNote("viewer")).toContain("will see their team's and can decide them");
    expect(viewerManagerNote("employee")).toBeNull();
    expect(viewerManagerNote("company_admin")).toBeNull();
  });
});

describe("memberHierarchy: role words", () => {
  it("never prints a database slug", () => {
    expect(roleWord("company_admin")).toBe("Owner");
    expect(roleWord("employee")).toBe("Employee");
    expect(roleWord("viewer")).toBe("Viewer");
    expect(roleWord("technician")).toBe("Team member");
  });
});

describe("memberHierarchy: the re-parent confirmation", () => {
  const base = {
    memberName: "Priya Nair",
    managerId: "u-arjun",
    managerName: "Arjun",
    selfUserId: "u-self",
  };

  it("is absent when the person has no direct reports", () => {
    expect(reparentNotice({ ...base, directReports: 0 })).toBeNull();
  });

  it("names the count and where the branch goes", () => {
    expect(reparentNotice({ ...base, directReports: 1 })).toBe(
      "Priya's 1 direct report will now report to Arjun.",
    );
    expect(reparentNotice({ ...base, directReports: 3 })).toBe(
      "Priya's 3 direct reports will now report to Arjun.",
    );
  });

  it("says you only when the id is the signed-in owner — never by name", () => {
    expect(reparentNotice({ ...base, managerId: "u-self", directReports: 2 })).toBe(
      "Priya's 2 direct reports will now report to you.",
    );
    // A different member who happens to share the owner's name is not "you".
    expect(
      reparentNotice({
        ...base,
        managerName: "Ravi Kumar",
        managerId: "u-other",
        directReports: 1,
      }),
    ).toBe("Priya's 1 direct report will now report to Ravi Kumar.");
  });

  it("says the team moves to the company owner when the pointer is cleared", () => {
    expect(reparentNotice({ ...base, managerId: null, managerName: null, directReports: 3 })).toBe(
      "Priya's 3 direct reports will now report to the company owner.",
    );
  });

  it("falls back to a neutral name for a nameless member", () => {
    expect(reparentNotice({ ...base, memberName: null, directReports: 1 })).toBe(
      "This person's 1 direct report will now report to Arjun.",
    );
  });
});

describe("memberHierarchy: helpers", () => {
  it("compares manager ids, not names", () => {
    expect(sameManager(null, null)).toBe(true);
    expect(sameManager("u-1", "u-1")).toBe(true);
    expect(sameManager("u-1", "u-2")).toBe(false);
  });

  it("builds the role map and tolerates a malformed roster", () => {
    expect(roleMap([ARJUN, PRIYA]).get("u-arjun")).toBe("company_admin");
    expect(roleMap(undefined as unknown as MemberRow[]).size).toBe(0);
  });
});
