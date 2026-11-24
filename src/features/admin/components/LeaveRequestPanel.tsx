import { Link } from "react-router";
import type { LeaveRow } from "../companyApi";
import type { LeaveBalanceRow } from "../leaveApi";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./Badge";
import { LeaveRequestActions } from "./LeaveRequestActions";
import { fmtDay } from "../format";
import { humanize } from "../status";
import styles from "./LeaveRequestPanel.module.css";

/** One balance row of the panel's allowance list: remaining against the
 *  year's gross (credits + accrued + carry-forward). A zero gross is the
 *  honest empty state — no bar to render, just the fact. */
function BalanceLine({ balance }: { balance: LeaveBalanceRow }) {
  const gross = balance.credits + balance.accrued + balance.carryForward;
  const fill = gross > 0 ? Math.min(Math.max(balance.remaining / gross, 0), 1) : 0;
  return (
    <li className={styles.balance}>
      <span className={styles.balanceName} data-disabled={balance.enabled ? undefined : ""}>
        {balance.name}
      </span>
      {gross > 0 ? (
        <>
          <span className={styles.balanceBar} aria-hidden="true">
            <span className={styles.balanceFill} style={{ width: `${fill * 100}%` }} />
          </span>
          <span className={styles.balanceFigure}>
            {balance.remaining} of {gross} days left
          </span>
        </>
      ) : (
        <span className={styles.balanceEmpty}>No balance recorded for this type.</span>
      )}
    </li>
  );
}

/** The requests tab's detail panel — the design's right-hand side: who,
 *  when, why, the day-by-day dates with each day's own state, the
 *  employee's allowance (a generic per-type list — the list wire carries no
 *  leave type, so there is no single "this request's" balance to pick), and
 *  the same decision buttons the rows carry. Closed = no `selected` param. */
export function LeaveRequestPanel({
  request,
  balances,
  closeUrl,
  onClose,
}: {
  request: LeaveRow;
  balances: LeaveBalanceRow[] | null;
  closeUrl: string;
  onClose: () => void;
}) {
  const name = request.employeeName ?? request.employeeCode ?? "Unknown";
  return (
    <aside
      className={styles.panel}
      aria-label="Request details"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Escape inside one of the decision dialogs means "close that
        // dialog" — the browser already did; it must not also close the
        // panel the dialog lives in.
        if (event.target instanceof Element && event.target.closest("dialog[open]") !== null) {
          return;
        }
        onClose();
      }}
    >
      <header className={styles.head}>
        <h3 className={styles.title}>Request details</h3>
        <Link className={styles.close} to={closeUrl} autoFocus aria-label="Close details">
          Close
        </Link>
      </header>
      <div className={styles.person}>
        <Avatar name={request.employeeName ?? null} imageUrl={request.employeeAvatarUrl} />
        <div>
          <p className={styles.personName}>{name}</p>
          {request.employeeCode ? (
            <p className={styles.personCode}>{request.employeeCode}</p>
          ) : null}
        </div>
        <StatusBadge status={request.status} />
      </div>
      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>From</dt>
          <dd>
            {fmtDay(request.startDate)}
            {request.part !== undefined && request.part !== "full_day"
              ? ` · ${humanize(request.part)}`
              : ""}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>To</dt>
          <dd>{fmtDay(request.endDate)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Days</dt>
          <dd>
            {request.workingDays} of {request.totalDays} working
          </dd>
        </div>
        <div className={styles.fact}>
          <dt>Requested</dt>
          <dd>{fmtDay(request.createdAt.slice(0, 10))}</dd>
        </div>
      </dl>
      {request.dates.length > 0 ? (
        <ul className={styles.days}>
          {request.dates.map((day) => (
            <li key={day.date} className={styles.day}>
              <span>{fmtDay(day.date)}</span>
              <span className={styles.dayState} data-state={day.state}>
                {humanize(day.state)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {request.reason === "" ? null : (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>Reason</span>
          {request.reason}
        </p>
      )}
      <section className={styles.balanceSection} aria-label="Leave balance">
        <h4 className={styles.balanceHead}>Leave balance this year</h4>
        {balances === null ? (
          <p className={styles.balanceFailed} role="status">
            The balance could not be loaded — the request is still shown.
          </p>
        ) : balances.length === 0 ? (
          <p className={styles.balanceEmpty}>No balances recorded for this employee.</p>
        ) : (
          <ul className={styles.balances}>
            {balances.map((balance) => (
              <BalanceLine key={balance.typeId} balance={balance} />
            ))}
          </ul>
        )}
      </section>
      {/* A decided request (revoked / cancelled / rejected) has no actions —
          no footer, so the divider line never draws under nothing. */}
      {request.status === "pending" || request.status === "approved" ? (
        <footer className={styles.actions}>
          <LeaveRequestActions request={request} />
        </footer>
      ) : null}
    </aside>
  );
}
