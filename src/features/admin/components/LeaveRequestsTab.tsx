import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Link, useFetcher, useNavigate } from "react-router";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { LeaveRow, LeaveStatusCounts } from "../companyApi";
import type { LeaveBalanceRow } from "../leaveApi";
import type { LeaveSelection, LeaveStatusFilter } from "../leaveLoaders";
import { LEAVE_STATUSES } from "../leaveLoaders";
import { leaveRequestsUrl } from "../leaveUrl";
import { localIsoDate, localIsoToday, monthLabel, shiftMonth, shortDay } from "../leaveDateMath";
import { fmtDay } from "../format";
import { humanize } from "../status";
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

/** The pills' words, the design's own: the queue reads "Needs review", an
 *  owner-revoked approval reads "Revoked" — distinct from "Cancelled"
 *  (the employee's own withdrawal, `cancelled`); the wire's raw words only
 *  ever reach the status chips. */
const PILL_LABELS: Record<Exclude<LeaveStatusFilter, "all">, string> = {
  pending: "Needs review",
  approved: "Approved",
  revoked: "Revoked",
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
  // The tenant-wide counts answer "how many everywhere", not "how many in
  // this window" — while a search or a month narrows the list, the numbers
  // go quiet so a filtered list is never contradicted (the round-4 defer).
  const countsVisible = q === "" && month === "";
  // The card's dismissal is local, never URL state: the loader auto-selects
  // a row, so no address means "closed" — a reload is a fresh visit and the
  // card returns. Tapping any row is an explicit ask and reopens it.
  const [cardClosed, setCardClosed] = useState(false);
  // Where keyboard focus lands when the card closes — the list keeps the
  // row taps, so it inherits the dismissal instead of focus dying to body.
  const listRef = useRef<HTMLElement>(null);

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
            All
            {countsVisible && total !== null ? (
              <span className={styles.pillCount}>{total}</span>
            ) : null}
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
                {countsVisible && count !== null ? (
                  <span className={styles.pillCount}>{count}</span>
                ) : null}
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

      <section ref={listRef} tabIndex={-1} className={styles.listCol} aria-label="Requests">
        {counts !== null && total !== null && countsVisible ? (
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
                  onClick={() => setCardClosed(false)}
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

      {selection !== null && !cardClosed ? (
        <DetailsCard
          selection={selection}
          onClose={() => {
            setCardClosed(true);
            listRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

/** The design's right-hand card: who, the request's facts, the span day by
 *  day, every type's allowance with where this request fits, the coverage
 *  check, and the decision controls — a pending request gets the note +
 *  Approve/Decline form, an approved one the revoke dialog, a decided one
 *  nothing. The Close button dismisses the card until the next row tap. */
function DetailsCard({ selection, onClose }: { selection: LeaveSelection; onClose: () => void }) {
  const { request, balances, coverage } = selection;
  const fetcher = useFetcher<LeaveActionResult>();
  const name = request.employeeName ?? request.employeeCode ?? "Unknown";
  const busy = fetcher.state !== "idle";
  const error =
    fetcher.data !== undefined && fetcher.data.state === "error" ? fetcher.data.message : null;

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
        <div className={styles.headEnd}>
          <StatusBadge status={request.status} />
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close details"
            onClick={onClose}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
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
          <dt>Requested on</dt>
          <dd>{fmtDay(localIsoDate(new Date(request.createdAt)))}</dd>
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

      {/* The span, day by day — the split a revoke talks about, back on the
          card: each date wears the state the wire carries for it. */}
      {request.dates.length > 0 ? (
        <ul className={styles.dayStrip} aria-label="Days, one by one">
          {request.dates.map((day) => (
            <li key={day.date} className={styles.dayChip}>
              <span>{fmtDay(day.date)}</span>
              <span className={styles.dayState} data-state={day.state}>
                {humanize(day.state)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <AllowanceSection request={request} balances={balances} balancesFailed={balances === null} />

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

/** Every accrual-bearing type's allowance, the request's own type first:
 *  a heading with the days still left, one bar split into where the days
 *  stand after this request (pending) or with it counted in (approved), and
 *  the legend. The other types read as plain context — no requested segment,
 *  since the request spends none of them. Untyped rows and types the balance
 *  endpoint excludes (Comp-Off) get the honest line beside the blocks. */
function AllowanceSection({
  request,
  balances,
  balancesFailed,
}: {
  request: LeaveRow;
  balances: LeaveBalanceRow[] | null;
  balancesFailed: boolean;
}) {
  if (balancesFailed) {
    return (
      <p className={styles.allowQuiet} role="status">
        The balance could not be loaded — the request is still shown.
      </p>
    );
  }
  const subject =
    balances === null
      ? null
      : request.leaveTypeCode
        ? (balances.find((balance) => balance.code === request.leaveTypeCode) ?? null)
        : null;
  const explains = request.leaveTypeName
    ? subject === null
      ? `No balance recorded for ${request.leaveTypeName}.`
      : null
    : "No leave type set — this request reads as paid.";
  // The request's own type leads; the rest follow in the wire's order.
  const ordered =
    balances === null
      ? []
      : subject === null
        ? balances
        : [subject, ...balances.filter((balance) => balance !== subject)];
  if (ordered.length === 0 && explains === null) return null;
  return (
    <section className={styles.allowances} aria-label="Leave balances">
      {explains !== null ? (
        <p className={styles.allowQuiet} role="status">
          {explains}
        </p>
      ) : null}
      {ordered.map((balance) => (
        <BalanceBlock
          key={balance.typeId}
          balance={balance}
          request={balance === subject ? request : null}
        />
      ))}
    </section>
  );
}

/** One type's allowance block. `request` arrives only for the block the
 *  request actually spends — its bar carries the amber requested segment
 *  while the request is pending, and its heading names it. A turned-off
 *  type wears the "Turned Off" chip and fades: its balance still answers
 *  (its used days count), it just no longer earns days. A zero-gross row
 *  collapses to the quiet line — the off-state keeps its chip and any
 *  used-days figure there too. */
/** Exactly 1 reads singular — the same plain-English rule the backend's
 *  refusal copy follows. */
const dayWord = (n: number) => (n === 1 ? "day" : "days");

function BalanceBlock({
  balance,
  request,
}: {
  balance: LeaveBalanceRow;
  request: LeaveRow | null;
}) {
  const gross = balance.credits + balance.accrued + balance.carryForward;
  const remaining = Math.max(balance.remaining, 0);
  const off = balance.enabled === false;
  if (gross <= 0) {
    return (
      <p className={styles.allowQuiet}>
        No balance recorded for {balance.name}.
        {balance.consumed > 0 ? (
          <>
            {" "}
            {balance.consumed} {dayWord(balance.consumed)} used this year.
          </>
        ) : null}
        {off ? (
          <>
            {" "}
            <span className={styles.allowTagOff}>Turned Off</span>
          </>
        ) : null}
      </p>
    );
  }
  const pct = (days: number) => `${Math.min(Math.max(days / gross, 0), 1) * 100}%`;
  const pending = request !== null && request.status === "pending";
  const requested = pending ? request.workingDays : 0;
  const used = pending
    ? Math.max(gross - remaining - requested, 0)
    : Math.max(gross - remaining, 0);
  // The total's provenance — the parts the backend returns separately
  // and the panel collapses into one figure. Only the non-zero parts
  // speak; credits can net offsetting corrections, so the sign rides
  // along as-is.
  const parts: string[] = [];
  if (balance.credits !== 0) parts.push(`${balance.credits} credited`);
  if (balance.accrued !== 0) parts.push(`${balance.accrued} accrued`);
  if (balance.carryForward !== 0) parts.push(`${balance.carryForward} carried forward`);
  return (
    <section
      className={off ? `${styles.allowance} ${styles.allowOff}` : styles.allowance}
      aria-label={`${balance.name} allowance`}
    >
      <h4 className={styles.allowHead}>
        {balance.name} days allowance — {remaining} {dayWord(remaining)} remaining
        {off ? <span className={styles.allowTagOff}>Turned Off</span> : null}
        {request !== null ? <span className={styles.allowTag}>this request</span> : null}
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
          {remaining}{" "}
          {pending ? `${dayWord(remaining)} after approval` : `${dayWord(remaining)} remaining`}
        </span>
        <span className={styles.legendRequested}>
          {pending ? `${requested} requested` : `${used} used`}
        </span>
        <span className={styles.legendTotal}>{gross} total allowance</span>
      </p>
      {parts.length > 0 ? <p className={styles.allowBreakdown}>{parts.join(" · ")}</p> : null}
    </section>
  );
}
