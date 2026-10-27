import { redirect, type ActionFunctionArgs } from "react-router";
import { ApiError } from "../../services/api";
import { readSession } from "../../services/session";
import { setPlatformAdminFlag, setUserDisabled } from "./adminApi";

export type FlagActionError = { status: number; errorCode?: string };
export type FlagActionData = { error: FlagActionError };

/**
 * The Account section's writes. One intent per submit; success redirects back
 * to the same lookup so the loader refetches the dossier fresh. Any backend
 * refusal (409 PLATFORM_ADMIN_SELF, 404, 403) comes back as data for the
 * inline error line instead of an error throw.
 */
export async function adminAccountAction({ request }: ActionFunctionArgs): Promise<unknown> {
  const session = readSession();
  if (session === null) {
    throw redirect("/login");
  }
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const userId = String(form.get("userId") ?? "");
  const phone = String(form.get("phone") ?? "");

  try {
    switch (intent) {
      case "promote":
        await setPlatformAdminFlag(session.token, userId, true);
        break;
      case "demote":
        await setPlatformAdminFlag(session.token, userId, false);
        break;
      case "disable":
        await setUserDisabled(session.token, userId, true);
        break;
      case "enable":
        await setUserDisabled(session.token, userId, false);
        break;
      default:
        return { error: { status: 400 } satisfies FlagActionError };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      const body: FlagActionData = {
        error: { status: error.status, errorCode: error.errorCode },
      };
      return body;
    }
    throw error;
  }
  throw redirect(`/admin/account?phone=${encodeURIComponent(phone)}`);
}
