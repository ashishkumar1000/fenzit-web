import { afterEach, describe, expect, it } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { LeaveRow, LeaveSummary } from "../companyApi";
import {
  daysInMonth,
  localIsoToday,
  monthDay,
  monthLabel,
  nextWorkingDay,
  shiftDay,
  weekdayName,
  weekdayOf,
  workingDaysInMonth,
} from "../leaveDateMath";
import { LeaveCalendarTab } from "./LeaveCalendarTab";
import { LeaveTimeline } from "./LeaveTimeline";

// The calendar tab's controls and rail, rendered directly (no loader): the
// month nav pill and view toggle, the type pills + search narrowing the
// grid, the pulse's honest meter, the holidays tiles and the timeline's
// groups. Every fixture is anchored on the viewer's real today via
// localIsoToday(), so the tests never age.

function leaveFixture(
  overrides: Partial<LeaveRow> & Pick<LeaveRow, "id" | "startDate" | "endDate">,
): LeaveRow {
  const { startDate, endDate, ...rest } = overrides;
  const days = daysUntilInclusive(startDate, endDate);
  return {
    startDate,
    endDate,
    employeeId: overrides.id,
    employeeName: "Asha V",
    employeeCode: "EMP-001",
    leaveTypeId: "t-earned",
    leaveTypeCode: "earned",
    leaveTypeName: "Earned Leave",
    part: "full_day",
    reason: "",
    createdAt: "2026-11-10T04:30:00.000Z",
    workingDays: days,
    totalDays: days,
    employeeAvatarUrl: null,
    dates: eachDate(startDate, endDate).map((date) => ({ date, state: "approved" })),
    status: "approved",
    ...rest,
  };
}

function daysUntilInclusive(start: string, end: string): number {
  return eachDate(start, end).length;
}

function eachDate(start: string, end: string): string[] {
  const days: string[] = [];
  for (let cursor = start; cursor <= end; cursor = shiftDay(cursor, 1)) days.push(cursor);
  return days;
}

function renderTab(summary: LeaveSummary | null = { activeEmployees: 10 }) {
  const today = localIsoToday();
  const month = today.slice(0, 7);
  const futureStart = shiftDay(today, 2);
  const futureEnd = shiftDay(today, 3);
  const ongoingStart = shiftDay(today, -1);
  const rows: LeaveRow[] = [
    leaveFixture({
      id: "r-1",
      employeeId: "u-1",
      startDate: futureStart,
      endDate: futureEnd,
    }),
    leaveFixture({
      id: "r-2",
      employeeId: "u-2",
      employeeName: "Bunty R",
      employeeCode: "EMP-002",
      leaveTypeId: "t-sick",
      leaveTypeCode: "sick",
      leaveTypeName: "Sick Leave",
      startDate: ongoingStart,
      endDate: today,
    }),
  ];
  const holiday = shiftDay(today, 10);
  rows.push(
    leaveFixture({
      id: "r-3",
      employeeId: "u-3",
      employeeName: "Chitra S",
      employeeCode: "EMP-003",
      leaveTypeId: "t-bereave",
      leaveTypeCode: "bereavement",
      leaveTypeName: "Bereavement Leave",
      startDate: holiday,
      endDate: shiftDay(holiday, 1),
    }),
  );
  render(
    <MemoryRouter>
      <LeaveCalendarTab
        month={month}
        page={{ data: rows, nextCursor: null, hasMore: false }}
        // The timeline reads its own window — Chitra only occupies the
        // month grid here, so the timeline fixture stays the two named
        // spans (the reads are genuinely separate).
        upcoming={rows.filter((row) => row.id !== "r-3")}
        upcomingHasMore={false}
        holidays={[{ id: "h-1", date: holiday, name: "Winter Closure" }]}
        summary={summary}
      />
    </MemoryRouter>,
  );
  return {
    today,
    month,
    futureStart,
    holidayDate: holiday,
    ashaDays: daysInMonth(futureStart, futureEnd, month),
    buntyDays: daysInMonth(ongoingStart, today, month),
    chitraDays: daysInMonth(holiday, shiftDay(holiday, 1), month),
    capacity: 10 * workingDaysInMonth(month),
  };
}

describe("LeaveCalendarTab: the controls and the rail", () => {
  afterEach(cleanup);

  it("the grid view carries the nav pill, the toggle, the pills and the honest pulse", () => {
    const { today, month, futureStart, holidayDate, ashaDays, buntyDays, chitraDays, capacity } =
      renderTab();
    expect(screen.getByRole("heading", { name: monthLabel(month) })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "This Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Monthly Grid", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Timeline", pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Leaves", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Earned", pressed: false })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search team member" })).toBeInTheDocument();
    // The grid speaks who: the ongoing day is Bunty's, the future one
    // Asha's (hers only when the +2 day still sits inside the month — the
    // suite runs on the real clock).
    const todayCell = screen.getByRole("button", { name: `${today}: Bunty R away` });
    expect(within(todayCell).getByText("1 on leave")).toBeInTheDocument();
    // Today's cell speaks the span's position instead of the person line —
    // one person out, so "Day 2 of 2" stays attributable.
    expect(within(todayCell).getByText("Day 2 of 2")).toBeInTheDocument();
    if (futureStart.slice(0, 7) === month) {
      expect(
        screen.getByRole("button", { name: `${futureStart}: Asha V away` }),
      ).toBeInTheDocument();
    }
    // The pulse counts both people and their month days, and the meter
    // states its own rule: capacity = active × working days, holidays not
    // subtracted.
    expect(screen.getByText("Team on leave")).toBeInTheDocument();
    expect(screen.getByText("Total days out")).toBeInTheDocument();
    const out = ashaDays + buntyDays + chitraDays;
    const available = capacity - out;
    const pct = Math.round((available / capacity) * 100);
    expect(
      screen.getByText(`${available} of ${capacity} working days free · 10 active`),
    ).toBeInTheDocument();
    expect(screen.getByText(`${pct}% Available`)).toBeInTheDocument();
    // The breakdown splits the same days per type, fully typed here.
    expect(
      screen.getByText(`Distribution across ${out} ${out === 1 ? "day" : "days"}`),
    ).toBeInTheDocument();
    expect(screen.getByText("100% Accounted")).toBeInTheDocument();
    if (ashaDays > 0) expect(screen.getByText("Earned Leave")).toBeInTheDocument();
    expect(screen.getByText("Sick Leave")).toBeInTheDocument();
    // The holiday tile names the day, and the meta line speaks the weekday
    // over the honest single day · all offices scope, with the calendar
    // link beneath.
    expect(screen.getByText("Winter Closure")).toBeInTheDocument();
    expect(
      screen.getByText(`${weekdayName(shiftDay(today, 10))} · Single Day · All Offices`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `View ${shiftDay(today, 10).slice(0, 4)} Holiday Calendar →`,
      }),
    ).toBeInTheDocument();
    // A holiday sharing its day with leave speaks both: the closure chip
    // over the named holiday-and-leaves line (the grid cell, only when the
    // holiday's date sits inside the rendered month).
    if (holidayDate.slice(0, 7) === month) {
      const sharedCell = screen.getByRole("button", {
        name: `${holidayDate}: Chitra S away — office closed for Winter Closure`,
      });
      expect(within(sharedCell).getByText("Office Closed")).toBeInTheDocument();
      expect(within(sharedCell).getByText("Winter Closure • 1 Leave")).toBeInTheDocument();
    }
  });

  it("the type pill and the search narrow the grid; filtered-empty offers the way back", () => {
    const { today, month, futureStart } = renderTab();
    const ashaCell = `${futureStart}: Asha V away`;
    fireEvent.click(screen.getByRole("button", { name: "Sick" }));
    expect(screen.getByRole("button", { name: "Sick", pressed: true })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: ashaCell })).toBeNull();
    expect(screen.getByRole("button", { name: `${today}: Bunty R away` })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search team member" }), {
      target: { value: "Asha" },
    });
    expect(screen.getByText("No approved leave matches the filters.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "All Leaves", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${today}: Bunty R away` })).toBeInTheDocument();
    if (futureStart.slice(0, 7) === month) {
      expect(screen.getByRole("button", { name: ashaCell })).toBeInTheDocument();
    }
  });

  it("the timeline view groups the window and speaks the return lines", () => {
    const { today } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByRole("button", { name: "Timeline", pressed: true })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Monthly Grid", pressed: false }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "This Week" })).toBeInTheDocument();
    expect(screen.getByText("2 leaves scheduled")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Next Week" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Later" })).toBeNull();
    const timeline = within(screen.getByLabelText("Upcoming leave timeline"));
    expect(timeline.getByText("Starts in 2 days")).toBeInTheDocument();
    // Bunty ends today: "Back tomorrow" only when tomorrow is a working
    // day — the suite runs on the real clock, so compute the same claim
    // the component does (a Friday end names Monday instead).
    const buntyBack =
      weekdayOf(shiftDay(today, 1)) === 0 || weekdayOf(shiftDay(today, 1)) === 6
        ? `Back on ${monthDay(nextWorkingDay(today))}`
        : "Back tomorrow";
    expect(timeline.getByText(buntyBack)).toBeInTheDocument();
    expect(timeline.getByText("EMP-001")).toBeInTheDocument();
    expect(timeline.getByText("EMP-002")).toBeInTheDocument();
    expect(timeline.getAllByText("Approved").length).toBe(2);
    // The today-anchored card is Bunty's sick span — the pill names it.
    expect(timeline.getByText("Sick Leave")).toBeInTheDocument();
    // The timeline's window is whole here — no truncation line.
    expect(screen.queryByText(/More approvals exist than fit the upcoming window/)).toBeNull();
    // An impossible search narrows the timeline honestly too.
    fireEvent.change(screen.getByRole("searchbox", { name: "Search team member" }), {
      target: { value: "Zed" },
    });
    expect(screen.getByText("No upcoming leave matches the filters.")).toBeInTheDocument();
  });

  it("a leave ending today before a weekend names the working day — never a Saturday back", () => {
    // Fixed clock: 2026-11-27 is a Friday, so "tomorrow" is Saturday and
    // the return line must name Monday the 30th instead.
    render(
      <MemoryRouter>
        <LeaveTimeline
          today="2026-11-27"
          groups={{
            thisWeek: [
              leaveFixture({
                id: "r-9",
                employeeId: "u-9",
                employeeName: "Devi P",
                employeeCode: "EMP-004",
                startDate: "2026-11-23",
                endDate: "2026-11-27",
              }),
            ],
            nextWeek: [],
            later: [],
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Back on Nov 30")).toBeInTheDocument();
    expect(screen.queryByText("Back tomorrow")).toBeNull();
  });

  it("a missing summary degrades to a meterless pulse — the tiles and the grid stay", () => {
    renderTab(null);
    // The tiles come from the month's rows, not the summary — they stay.
    expect(screen.getByText("Team on leave")).toBeInTheDocument();
    expect(screen.getByText("Total days out")).toBeInTheDocument();
    // The meter and its claims hide, and the absence is explained.
    expect(screen.queryByText(/% Available/)).toBeNull();
    expect(
      screen.getByText("The team size is unavailable right now — the availability meter needs it."),
    ).toBeInTheDocument();
    // The grid is untouched by the degraded read.
    expect(screen.getByRole("searchbox", { name: "Search team member" })).toBeInTheDocument();
  });
});
