/**
 * memberHierarchy.ts — the pure decisions behind the owner's reporting-tree
 * surfaces (Epic 24, story 24-6 / CAP-6). No React, no network: every rule is
 * a function of the shipped wire shapes (`managerId`, `chain`, `headcount`,
 * `directReports`), so the copy and the gates can be tested on their own.
 *
 * The chain carries `{ userId, name }` only, so the role words and the
 * `(Owner)` mark come from the roster the loader read — never from a link's
 * position (a branch's top can be an unassigned non-admin).
 */
import type { MemberChainLink, MemberRow } from "./companyApi";
import { ROLE_WORDS } from "./employeesLabels";

/** The approved line for an admin record: they sit above the tree. */
export const ADMIN_TOP_LINE = "Admins sit at the top of the team.";

/** A person of the roster, as the hierarchy copy needs them. */
export type HierarchyMember = Pick<MemberRow, "userId" | "name" | "role" | "status" | "chain"> &
  Partial<Pick<MemberRow, "managerId" | "managerName" | "headcount" | "directReports">>;

/** userId → role, for the `(Owner)` mark. The roster is the only source. */
export function roleMap(members: Array<Pick<MemberRow, "userId" | "role">>): Map<string, string> {
  // A malformed roster (an object where the array belongs) degrades to plain
  // names rather than taking the page down with it.
  if (!Array.isArray(members)) return new Map();
  return new Map(members.map((member) => [member.userId, member.role]));
}

/** The first word of a display name, for the re-parent sentence. */
export function firstName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  return trimmed === "" ? "This person" : trimmed.split(/\s+/)[0];
}

/**
 * The upward chain as one line, nearest first, with the top admin marked:
 * "Priya → Arjun (Owner)". Null when there is no chain to show.
 */
export function chainLine(chain: MemberChainLink[], roles: Map<string, string>): string | null {
  if (!Array.isArray(chain) || chain.length === 0) return null;
  return chain
    .map((link) => {
      // `users.name` is nullable in the database, so a nameless manager must
      // never print "null (Owner)" inside the chain.
      const name = (link.name ?? "").trim() === "" ? "Team member" : link.name;
      return roles.get(link.userId) === "company_admin" ? `${name} (Owner)` : name;
    })
    .join(" → ");
}

/**
 * The "Reports to" value on a record: the chain, "Not set" when the person has
 * no manager, or the top-of-team line for an admin.
 */
export function reportsToLine(
  member: { role: string; chain: MemberChainLink[] },
  roles: Map<string, string>,
): string {
  if (member.role === "company_admin") return ADMIN_TOP_LINE;
  return chainLine(member.chain, roles) ?? "Not set";
}

/** "3 people report to them" / "1 person reports to them" / null at 0. */
export function headcountLine(headcount: number): string | null {
  if (!Number.isFinite(headcount) || headcount <= 0) return null;
  return headcount === 1 ? "1 person reports to them" : `${headcount} people report to them`;
}

/** "Owner" / "Employee" / "Viewer", never "Technician"; unknown roles fall
 *  back to a neutral noun rather than printing a DB slug. */
export function roleWord(role: string): string {
  return ROLE_WORDS[role] ?? "Team member";
}

/**
 * The picker's candidates: everyone the server would accept — active people,
 * minus the member themselves and everyone below them. "Below them" is read
 * off the server-computed chain (the same walk the cycle check uses), so the
 * client never walks the tree and never offers a guaranteed 409.
 */
export function managerCandidates<T extends HierarchyMember>(members: T[], memberId: string): T[] {
  if (!Array.isArray(members)) return [];
  return members
    .filter(
      (member) =>
        member.status === "active" &&
        member.userId !== memberId &&
        !member.chain.some((link) => link.userId === memberId),
    )
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

/**
 * The stored manager when they are no longer a candidate — deactivation leaves
 * `manager_id` in place, so the picker must still show that person (selected,
 * non-selectable) or a Save would silently clear the pointer.
 */
export function inactiveCurrentManager(
  managerId: string | null,
  managerName: string | null,
  candidates: HierarchyMember[],
): { userId: string; name: string | null } | null {
  if (managerId === null) return null;
  if (candidates.some((member) => member.userId === managerId)) return null;
  return { userId: managerId, name: managerName };
}

/**
 * The D13 note for a viewer chosen as a reporting manager: a neutral fact,
 * not an error. Null for every other role.
 */
export function viewerManagerNote(role: string): string | null {
  return role === "viewer"
    ? "Viewers can't normally see leave or job requests. As a reporting manager, they will see their team's and can decide them."
    : null;
}

/** Id comparison — duplicate display names must never read as "you". */
export function sameManager(a: string | null, b: string | null): boolean {
  return a === b;
}

/**
 * What the pick changes before it saves (CAP-6). Only a member with direct
 * reports has a subtree whose routing moves with them; null otherwise.
 * Assigning says where it goes, clearing says who decides afterwards.
 */
export function reparentNotice(input: {
  memberName: string | null;
  directReports: number;
  managerId: string | null;
  managerName: string | null;
  selfUserId: string;
}): string | null {
  const { memberName, directReports, managerId, managerName, selfUserId } = input;
  // The payload declares this a number, but a missing one must never reach the
  // sentence as "undefined direct reports".
  if (!Number.isFinite(directReports) || directReports <= 0) return null;
  const name = firstName(memberName);
  const reports = directReports === 1 ? "1 direct report" : `${directReports} direct reports`;
  if (managerId === null) {
    return `${name} will have no reporting manager, so their team's requests go to the company admins.`;
  }
  const target = managerId === selfUserId ? "you" : (managerName ?? "the chosen manager");
  return `${name}'s ${reports} will now report to ${target}.`;
}
