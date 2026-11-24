import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link, useFetcher, useNavigate } from "react-router";
import type { FormEvent } from "react";
import type { LeaveRow, LeaveStatusCounts } from "../companyApi";
import type { LeaveBalanceRow } from "../leaveApi";
import type { LeaveSelection, LeaveStatusFilter } from "../leaveLoaders";
import { LEAVE_STATUSES } from "../leaveLoaders";
import { leaveRequestsUrl } from "../leaveUrl";
import { localIsoToday, monthLabel, shiftMonth, shortDay } from "../leaveDateMath";
import { fmtDay } from "../format";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./Badge";
import { LeaveRequestActions } from "./LeaveRequestActions";
import type { LeaveActionResult } from "../leaveLoaders";
import styles from "./LeaveRequestsTab.module.css";

/**
 * The requests tab, as the design draws it: one toolbar card (the status
 * pills with their counts, the search, the month window), the request list
 * on the left, and ONE selected request's details card on the right — a
 * card that is always present (the loader picks the first row when the
 * address names none). Every control is an address: a pill, a month, a row
 * tap or a search is navigation, and the loader refetches the truth.
 */

/** The pills' words, the design's own: the queue reads "Needs review", a
 *  withdrawn request reads "Self-cancelled" — the wire's raw words only
 *  ever reach the status chips. */
const PILL_LABELS: Record<Exclude<LeaveStatusFilter, "all">, string> = {
  pending: "Needs review",
  approved: "Approved",
  revoked: "Self-cancelled",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** A request's span the way the design says it: "28 Nov – 30 Nov 2026" —
 *  the short month on the left, the full date closing the range. */
function spanLabel(request: LeaveRow): string {
  return request.startDate === request.endDate
    ? fmtDay(request.startDate)
    : `${shortDay(request.startDate)} – ${fmtDay(request.endDate)}`;
}

export function LeaveRequestsTab({
  status,
  q,
  month,
  cursor,
  selected,
  counts,
  page,
  selection,
  hasMore,
  nextCursor,
}: {
  status: LeaveStatusFilter;
  q: string;
  month: string;
  cursor: string;
  selected: string;
  counts: LeaveStatusCounts | null;
  page: { data: LeaveRow[]; nextCursor: string | null; hasMore: boolean };
  selection: LeaveSelection | null;
  hasMore: boolean;
  nextCursor: string | null;
}) {
  const navigate = useNavigate();
  const filters = { status, q, month, cursor, selected };
  const requests = page.data;
  const total = counts === null ? null : Object.values(counts).reduce((sum, n) => sum + n, 0);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const needle = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (needle === q) return;
    navigate(leaveRequestsUrl(filters, { q: needle, cursor: "", selected: "" }));
  };

  const anchor = month === "" ? localIsoToday().slice(0, 7) : month;
  const prev = shiftMonth(anchor, -1);
  const next = shiftMonth(anchor, 1);

  return (
    <div className={styles.layout}>
      <section className={styles.toolbar} aria-label="Request filters">
        <div className={styles.pills} role="group" aria-label="Filter requests by state">
          <Link
            to={leaveRequestsUrl(filters, { status: "all", cursor: "", selected: "" })}
            className={status === "all" ? styles.pillActive : styles.pill}
            aria-current={status === "all" ? "true" : undefined}
          >
            All{total !== null ? <span className={styles.pillCount}>{total}</span> : null}
          </Link>
          {LEAVE_STATUSES.map((value) => {
            const count = counts === null ? null : counts[value];
            return (
              <Link
                key={value}
                to={leaveRequestsUrl(filters, { status: value, cursor: "", selected: "" })}
                className={status === value ? styles.pillActive : styles.pill}
                data-tone={value}
                aria-current={status === value ? "true" : undefined}
              >
                {(value === "pending" || value === "approved") && (
                  <span className={styles.pillDot} aria-hidden="true" />
                )}
                {PILL_LABELS[value]}
                {count !== null ? <span className={styles.pillCount}>{count}</span> : null}
              </Link>
            );
          })}
        </div>
        <div className={styles.toolbarRight}>
          <form role="search" onSubmit={onSearch}>
            <span className={styles.searchWrap}>
              <Search size={13} className={styles.searchGlyph} aria-hidden="true" />
              {/* Uncontrolled with the address as its key — back/forward
                  navigation re-seeds the box, a submit never fights state. */}
              <input
                key={q}
                type="search"
                name="q"
                defaultValue={q}
                className={styles.search}
                placeholder="Search by person or leave reason"
                aria-label="Search by person or leave reason"
              />
            </span>
          </form>
          <div className={styles.monthNav}>
            <Link
              to={leaveRequestsUrl(filters, { month: prev, cursor: "", selected: "" })}
              className={styles.monthStep}
              aria-label={`Previous month, ${monthLabel(prev)}`}
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </Link>
            <span className={styles.monthLabel}>
              {month === "" ? "All time" : monthLabel(month)}
            </span>
            <Link
              to={leaveRequestsUrl(filters, { month: next, cursor: "", selected: "" })}
              className={styles.monthStep}
              aria-label={`Next month, ${monthLabel(next)}`}
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {month !== "" ? (
            <Link
              to={leaveRequestsUrl(filters, { month: "", cursor: "", selected: "" })}
              className={styles.allTime}
            >
              All months
            </Link>
          ) : null}
        </div>
      </section>

      <section className={styles.listCol} aria-label="Requests">
        {counts !== null && total !== null ? (
          <p className={styles.listMeta}>
            <span className={styles.listMetaChip}>{total} total</span>
            <span className={styles.listMetaChip} data-tone="pending">
              <span className={styles.pillDot} aria-hidden="true" />
              {counts.pending === 1 ? "1 needs review" : `${counts.pending} need review`}
            </span>
            <span className={styles.sortNote}>Newest first</span>
          </p>
        ) : (
          <p className={styles.listMeta}>
            <span className={styles.sortNote}>Newest first</span>
          </p>
        )}
        {requests.length === 0 ? (
          <p className={styles.empty}>No requests match — try another month, search or state.</p>
        ) : (
          <ul className={styles.rows}>
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  to={leaveRequestsUrl(filters, { selected: request.id })}
                  className={styles.row}
                  data-selected={selected === request.id ? "" : undefined}
                  aria-current={selected === request.id ? "true" : undefined}
                >
                  <Avatar
                    name={request.employeeName ?? null}
                    imageUrl={request.employeeAvatarUrl}
                  />
                  <span className={styles.rowMain}>
                    <span className={styles.rowName}>
                      {request.employeeName ?? request.employeeCode ?? "Unknown"}
                    </span>
                    <span className={styles.rowSub}>
                      {[request.employeeCode, request.officeName]
                        .filter((part) => part)
                        .join(" • ")}
                    </span>
                    <span className={styles.rowDates}>
                      {spanLabel(request)}
                      <span className={styles.rowDays}>
                        {request.workingDays}{" "}
                        {request.workingDays === 1 ? "working day" : "working days"}
                      </span>
                    </span>
                  </span>
                  {request.leaveTypeName ? (
                    <span className={styles.typePill} data-code={request.leaveTypeCode}>
                      {request.leaveTypeName}
                    </span>
                  ) : null}
                  <StatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {requests.length > 0 || hasMore || cursor !== "" ? (
          <div className={styles.pager}>
            <span className={styles.sortNote}>Up to 20 at a time.</span>
            {cursor !== "" ? (
              <Link className={styles.pagerStep} to={leaveRequestsUrl(filters, { cursor: "" })}>
                Start over
              </Link>
            ) : null}
            {hasMore && nextCursor !== null ? (
              <Link
                className={styles.pagerStep}
                to={leaveRequestsUrl(filters, { cursor: nextCursor })}
              >
                Older ›
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {selection !== null ? <DetailsCard selection={selection} /> : null}
    </div>
  );
}

/** The design's right-hand card: who, the request's facts, the type's
 *  allowance with where this request fits, the coverage check, and the
 *  decision controls — a pending request gets the note + Approve/Decline
 *  form, an approved one the revoke dialog, a decided one nothing. */
function DetailsCard({ selection }: { selection: LeaveSelection }) {
  const { request, balances, coverage } = selection;
  const fetcher = useFetcher<LeaveActionResult>();
  const name = request.employeeName ?? request.employeeCode ?? "Unknown";
  const busy = fetcher.state !== "idle";
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;

  const typeBalance =
    balances === null
      ? null
      : ((request.leaveTypeCode
          ? balances.find((balance) => balance.code === request.leaveTypeCode)
          : undefined) ?? null);

  const place =
    coverage === null
      ? null
      : coverage.officeName === null
        ? "across the company"
        : `in ${coverage.officeName}`;

  return (
    <aside className={styles.card} aria-label="Request details">
      <header className={styles.cardHead}>
        <h3 className={styles.cardTitle}>Request details</h3>
        <StatusBadge status={request.status} />
      </header>
      <div className={styles.person}>
        <Avatar name={request.employeeName ?? null} imageUrl={request.employeeAvatarUrl} />
        <div>
          <p className={styles.personName}>{name}</p>
          <p className={styles.personSub}>
            {[request.employeeCode, request.officeName].filter((part) => part).join(" • ")}
          </p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Leave type</dt>
          <dd>
            {request.leaveTypeName ? (
              <span className={styles.typePill} data-code={request.leaveTypeCode}>
                {request.leaveTypeName}
              </span>
            ) : (
              "Untyped — reads as paid"
            )}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Time off</dt>
          <dd>
            {request.workingDays} {request.workingDays === 1 ? "Working Day" : "Working Days"}
            {request.workingDays !== request.totalDays ? ` of ${request.totalDays} calendar` : ""}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Dates</dt>
          <dd>
            {spanLabel(request)}
            {request.part !== undefined && request.part !== "full_day"
              ? ` · ${
                  request.part === "first_half"
                    ? "First half"
                    : request.part === "second_half"
                      ? "Second half"
                      : request.part
                }`
              : ""}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Reason</dt>
          <dd>
            {request.reason === "" ? (
              "—"
            ) : (
              <span className={styles.reasonQuote}>“{request.reason}”</span>
            )}
          </dd>
        </div>
      </dl>

      <AllowanceSection
        request={request}
        balance={typeBalance}
        balancesFailed={balances === null}
      />

      {coverage === null ? (
        <p className={styles.coverageWarn} role="status">
          Coverage could not be checked.
        </p>
      ) : coverage.availableCount === 0 ? (
        <p className={styles.coverageWarn} role="status">
          No one else is available {place} for these dates.
        </p>
      ) : (
        <p className={styles.coverageOk}>
          {`Coverage check: ${coverage.availableCount} other ${
            coverage.availableCount === 1 ? "team member is" : "team members are"
          } available ${place} (${coverage.onDutyName ?? "nobody"} on duty)`}
        </p>
      )}

      {request.status === "pending" ? (
        <footer className={styles.decide}>
          <fetcher.Form method="post" className={styles.decideForm}>
            {/* The action routes on this id — without it the submission is
                a no-op the list never hears about. */}
            <input type="hidden" name="id" value={request.id} />
            <input
              type="text"
              name="reason"
              maxLength={500}
              placeholder="Add an optional approval note…"
              aria-label="Approval note (sent with whichever decision you pick)"
              className={styles.note}
              disabled={busy}
            />
            {error ? (
              <p className={styles.decideError} role="alert">
                {error}
              </p>
            ) : null}
            <div className={styles.decideRow}>
              <button
                type="submit"
                name="intent"
                value="approve"
                className={styles.approveBtn}
                disabled={busy}
              >
                Approve Request
              </button>
              <button
                type="submit"
                name="intent"
                value="reject"
                className={styles.declineBtn}
                disabled={busy}
              >
                Decline Request
              </button>
            </div>
          </fetcher.Form>
        </footer>
      ) : request.status === "approved" ? (
        <footer className={styles.decide}>
          <LeaveRequestActions request={request} />
        </footer>
      ) : null}
    </aside>
  );
}

/** The selected request's type allowance as the design draws it: a heading
 *  with the days still left, one bar split into where the days stand after
 *  this request (pending) or with it counted in (approved), and the legend.
 *  Untyped rows have no single balance to show — the honest line instead. */
function AllowanceSection({
  request,
  balance,
  balancesFailed,
}: {
  request: LeaveRow;
  balance: LeaveBalanceRow | null;
  balancesFailed: boolean;
}) {
  if (balancesFailed) {
    return (
      <p className={styles.allowQuiet} role="status">
        The balance could not be loaded — the request is still shown.
      </p>
    );
  }
  if (balance === null) {
    return (
      <p className={styles.allowQuiet} role="status">
        {request.leaveTypeName
          ? `No balance recorded for ${request.leaveTypeName}.`
          : "No leave type set — this request reads as paid."}
      </p>
    );
  }
  const gross = balance.credits + balance.accrued + balance.carryForward;
  const remaining = Math.max(balance.remaining, 0);
  if (gross <= 0) {
    return (
      <p className={styles.allowQuiet} role="status">
        No balance recorded for {balance.name}.
      </p>
    );
  }
  const pct = (days: number) => `${Math.min(Math.max(days / gross, 0), 1) * 100}%`;
  const pending = request.status === "pending";
  const requested = pending ? request.workingDays : 0;
  const used = pending
    ? Math.max(gross - remaining - requested, 0)
    : Math.max(gross - remaining, 0);
  return (
    <section className={styles.allowance} aria-label={`${balance.name} allowance`}>
      <h4 className={styles.allowHead}>
        {balance.name} days allowance — {remaining} days remaining
      </h4>
      <div className={styles.allowBar} aria-hidden="true">
        <span className={styles.allowAfter} style={{ width: pct(remaining) }} />
        {pending ? (
          <span className={styles.allowRequested} style={{ width: pct(requested) }} />
        ) : null}
        <span className={styles.allowUsed} style={{ width: pct(used) }} />
      </div>
      <p className={styles.allowLegend}>
        <span className={styles.legendAfter}>
          {remaining} {pending ? "days after approval" : "days remaining"}
        </span>
        <span className={styles.legendRequested}>
          {pending ? `${requested} requested` : `${used} used`}
        </span>
        <span className={styles.legendTotal}>{gross} total allowance</span>
      </p>
    </section>
  );
}
