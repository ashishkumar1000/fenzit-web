import type { ActionFunctionArgs } from "react-router";
import { requireConsoleRole } from "./adminLoader";
import { withPayrollError } from "./payrollAction";
import { normalizeMoney } from "./payrollFormat";
import { lockMonth, saveRunOverride, triggerRun } from "./payrollRunApi";
import { watchPayrollRun } from "./payrollRunWatcher";

/**
 * The runs/lock/override intents of the payroll page's action. The page's
 * one route action (payrollAction.ts) delegates here for these intents;
 * the same withPayrollError contract applies — BE 4xx copy verbatim.
 * Off-cycle staging writes live on the BE but need the membership row id
 * no shipped members surface carries, so they have no intents yet.
 */

export type PayrollRunActionResult =
  | { kind: "run-trigger"; state: "done" }
  | { kind: "run-trigger"; state: "error"; message: string }
  | { kind: "lock-month"; state: "done" }
  | { kind: "lock-month"; state: "error"; message: string }
  | { kind: "override-set"; state: "done" }
  | { kind: "override-set"; state: "error"; message: string };

const RUN_INTENTS = new Set(["run-trigger", "lock-month", "override-set"]);

/** True when the form's intent belongs to this module — the page action
 *  asks before falling through to the config intents. */
export function isRunIntent(intent: string): boolean {
  return RUN_INTENTS.has(intent);
}

const text = (form: FormData, key: string): string => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const MONTH_SHAPE = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const BAD_SEND = "That save could not be sent. Try again.";

function errorResult(intent: string, message: string): PayrollRunActionResult {
  if (intent === "lock-month") return { kind: "lock-month", state: "error", message };
  if (intent === "override-set") return { kind: "override-set", state: "error", message };
  return { kind: "run-trigger", state: "error", message };
}

/** The form arrives already parsed — the page action reads the body once
 *  (a Request's form body is single-use) and hands it down with the intent. */
export async function adminPayrollRunAction(
  { request }: ActionFunctionArgs,
  form: FormData,
): Promise<PayrollRunActionResult> {
  const intent = text(form, "intent");
  try {
    const { token } = await requireConsoleRole(request, ["owner"]);
    switch (intent) {
      case "run-trigger": {
        const month = text(form, "month");
        if (!MONTH_SHAPE.test(month))
          return errorResult(intent, "Pick a real month to run payroll for.");
        const run = await triggerRun(token, month, request.signal);
        // The run is async on the BE (the answer is the queued run) — the
        // watcher polls the runs list and toasts the outcome wherever the
        // person is, revalidating the page when it is mounted (CAP-9).
        watchPayrollRun(run);
        return { kind: "run-trigger", state: "done" };
      }
      case "lock-month": {
        const month = text(form, "month");
        if (!MONTH_SHAPE.test(month)) return errorResult(intent, BAD_SEND);
        await lockMonth(token, month, request.signal);
        return { kind: "lock-month", state: "done" };
      }
      case "override-set": {
        const userId = text(form, "userId");
        const month = text(form, "month");
        const field = text(form, "field") === "tds" ? "tds" : "pf_employee";
        const amount = normalizeMoney(text(form, "amount"));
        const acknowledged = form.get("acknowledgedLiability") === "true";
        if (userId === "" || !MONTH_SHAPE.test(month) || amount === null)
          return errorResult(
            intent,
            "Pick an employee, a month and an amount to set the override.",
          );
        await saveRunOverride(
          token,
          userId,
          { month, field, amount, acknowledgedLiability: acknowledged },
          request.signal,
        );
        return { kind: "override-set", state: "done" };
      }
      default:
        return errorResult(intent, BAD_SEND);
    }
  } catch (error) {
    return withPayrollError(error, request.signal, (message) => errorResult(intent, message));
  }
}
