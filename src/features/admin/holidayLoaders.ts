import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { clearSession } from "../../services/session";
import { ApiError } from "../../services/api";
import { isAuthError, requireConsoleRole } from "./adminLoader";
import {
  createHoliday,
  fetchHolidayImpact,
  fetchHolidayOverview,
  fetchHolidays,
  removeHoliday,
  updateHoliday,
  type HolidayImpact,
  type HolidayOverview,
} from "./companyApi";
import { withActionError } from "./adminBrowseLoaders";
import type { ExistingHolidayRow } from "./holidaysBulkSheet";

/**
 * The holidays pages' loaders and action (console redesign 2026-11-26).
 * Both pages ride ONE overview fetch (the year's holidays + the current
 * office headcounts) — the calendar page and the full-schedule page are two
 * views of the same year. The URL carries ?year= so every view is
 * shareable; ?inspect=<date> on the schedule page loads the inspector
 * sidebar's real-data facts, one extra call only when a row is opened.
 */

function validYear(url: URL): string {
  const asked = url.searchParams.get("year") ?? "";
  return /^\d{4}$/.test(asked) ? asked : String(new Date().getFullYear());
}

export type HolidaysPageData =
  | { state: "ok"; year: string; overview: HolidayOverview; selfName: string | null }
  | { state: "failed" };

export type HolidayScheduleData =
  | {
      state: "ok";
      year: string;
      overview: HolidayOverview;
      /** The inspector's facts when ?inspect=<date> is open, null otherwise. */
      inspect: HolidayImpact | null;
      /** The signed-in admin's display name — the design header greets them. */
      selfName: string | null;
    }
  | { state: "failed" };

export type HolidayUploadData =
  | {
      state: "ok";
      year: string;
      overview: HolidayOverview;
      /** EVERY year's holidays — the confirm popup classifies each sheet row
       *  against the whole calendar (New / Changed / already-there), not just
       *  the viewed year. */
      existing: ExistingHolidayRow[];
      selfName: string | null;
    }
  | { state: "failed" };

async function overviewOfYear(request: LoaderFunctionArgs["request"], year: string) {
  // requireConsoleRole already reads /users/me — the name rides along, no
  // second fetch (the console's double-/users/me rule). The token rides too:
  // consumers that need one more authed call reuse it instead of calling
  // requireConsoleRole again.
  const { token, me } = await requireConsoleRole(request, ["owner"]);
  return {
    token,
    overview: await fetchHolidayOverview(token, year, request.signal),
    selfName: me.name,
  };
}

export async function adminHolidaysLoader({
  request,
}: LoaderFunctionArgs): Promise<HolidaysPageData> {
  try {
    const year = validYear(new URL(request.url));
    const { overview, selfName } = await overviewOfYear(request, year);
    return { state: "ok", year, overview, selfName };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export async function adminHolidayUploadLoader({
  request,
}: LoaderFunctionArgs): Promise<HolidayUploadData> {
  try {
    const year = validYear(new URL(request.url));
    // One requireConsoleRole — the /users/me the console shell needs anyway
    // carries the token and the greeting name (the double-fetch rule).
    const { token, me } = await requireConsoleRole(request, ["owner"]);
    const overview = await fetchHolidayOverview(token, year, request.signal);
    // The whole calendar, every year: the popup's New / Already-there split
    // must be true for a 2028 sheet uploaded from a 2026 view.
    const all = await fetchHolidays(token, request.signal);
    return {
      state: "ok",
      year,
      overview,
      existing: all.map((h) => ({
        date: h.date,
        name: h.name,
        description: h.description ?? null,
        scope: h.scope === "offices" ? "offices" : "all",
        officeIds: h.officeIds ?? [],
      })),
      selfName: me.name,
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export async function adminHolidayScheduleLoader({
  request,
}: LoaderFunctionArgs): Promise<HolidayScheduleData> {
  try {
    const url = new URL(request.url);
    const year = validYear(url);
    const { token, overview, selfName } = await overviewOfYear(request, year);
    // The inspector's facts ride the same navigation: opening a row sets
    // ?inspect=<date>, closing it clears the param — the sidebar always
    // shows what the URL says is open, never stale sheet state.
    const inspectDate = url.searchParams.get("inspect");
    const inspect =
      inspectDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(inspectDate)
        ? await (async () => {
            try {
              return await fetchHolidayImpact(token, inspectDate, request.signal);
            } catch (error) {
              // A failed inspection degrades to a closed sheet — the table
              // stays usable (the retry is one more click). Auth expiry and
              // aborted navigations are NOT "a failed inspection": the 401
              // must reach the outer catch's login redirect, the abort its
              // own propagation.
              if (isAuthError(error) || request.signal.aborted) throw error;
              return null;
            }
          })()
        : null;
    return { state: "ok", year, overview, inspect, selfName };
  } catch (error) {
    if (error instanceof Response) throw error;
    if (isAuthError(error)) {
      clearSession();
      throw redirect("/login");
    }
    if (request.signal.aborted) throw error;
    return { state: "failed" };
  }
}

export type HolidayActionResult =
  | { kind: "create" | "update" | "remove"; state: "done" }
  | { kind: "create" | "update" | "remove"; state: "error"; message: string };

/** A retried write must not duplicate the holiday — the backend's (tenant,
 *  date) unique maps the raced add to a 409 the modal phrases plainly. */
function holidayErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && error.errorCode === "ATTENDANCE_HOLIDAY_TAKEN") {
    return "A holiday on this date already exists. Pick another date or edit the existing one.";
  }
  return null;
}

export async function adminHolidayAction({
  request,
}: ActionFunctionArgs): Promise<HolidayActionResult> {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const kind = intent === "create" || intent === "update" || intent === "remove" ? intent : null;
  if (kind === null) {
    return {
      kind: "create",
      state: "error",
      message: "We could not save the holiday. Please try again.",
    };
  }
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    if (kind === "remove") {
      const id = String(form.get("id") ?? "");
      if (!id)
        return {
          kind,
          state: "error",
          message: "This holiday could not be found. Refresh and try again.",
        };
      await removeHoliday(token, id);
      return { kind, state: "done" };
    }
    const name = String(form.get("name") ?? "").trim();
    const date = String(form.get("date") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const id = String(form.get("id") ?? "");
    // Office chips: one officeId per field, "" = every office (scope all).
    const officeIds = form
      .getAll("officeId")
      .filter((v): v is string => typeof v === "string" && v !== "");
    if (name === "" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { kind, state: "error", message: "Please enter the holiday's name and date." };
    }
    if (kind === "create") {
      await createHoliday(token, {
        date,
        name,
        ...(description !== "" ? { description } : {}),
        officeIds,
      });
      return { kind, state: "done" };
    }
    if (!id) {
      return {
        kind,
        state: "error",
        message: "This holiday could not be found. Refresh and try again.",
      };
    }
    await updateHoliday(token, id, {
      date,
      name,
      ...(description !== "" ? { description } : { description: null }),
      officeIds,
    });
    return { kind, state: "done" };
  } catch (error) {
    const taken = holidayErrorMessage(error);
    if (taken !== null) return { kind, state: "error", message: taken };
    return withActionError<HolidayActionResult>(error, request.signal, (message) => ({
      kind,
      state: "error",
      message,
    }));
  }
}
