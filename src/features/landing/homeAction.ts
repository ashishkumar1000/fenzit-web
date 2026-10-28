import type { ActionFunctionArgs } from "react-router";
import { callBackAction } from "./contactRequestAction";
import { earlyAccessAction } from "./earlyAccessAction";

/**
 * The home page has two forms: early access and call back. Both post to the
 * same route, so this reads the hidden "intent" field and passes the request on.
 * The request body is read on a copy, so the chosen action can read it again.
 */
export async function homeAction(args: ActionFunctionArgs) {
  const form = await args.request.clone().formData();
  if (form.get("intent") === "call-back") {
    return callBackAction(args);
  }
  return earlyAccessAction(args);
}
