import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "../../../components/ui/Button";
import type { DossierUser } from "../dossier-types";
import { GlyphKey } from "./glyphs";
import styles from "./FlagControls.module.css";

export type FlagIntent = "promote" | "demote" | "disable" | "enable";

const CONFIRM_COPY: Record<FlagIntent, { question: string; yes: string }> = {
  promote: {
    question: "Promote to fenzit staff? They will open this console and can inspect any user.",
    yes: "Yes, promote",
  },
  demote: {
    question: "Demote from fenzit staff? They lose staff access to the console and the lookup API.",
    yes: "Yes, demote",
  },
  disable: {
    question:
      "Disable the account? They cannot sign in anywhere. History is kept, and this is reversible.",
    yes: "Yes, disable",
  },
  enable: {
    question: "Enable the account? They can sign in again.",
    yes: "Yes, enable",
  },
};

function flagErrorMessage(error: { status: number; errorCode?: string }): string {
  if (error.errorCode === "PLATFORM_ADMIN_SELF") {
    return "The backend refused: you cannot change your own staff flag. Ask another platform admin.";
  }
  if (error.errorCode === "RESOURCE_NOT_FOUND") {
    return "That account no longer exists.";
  }
  if (error.status === 403) {
    return "Your sign-in can no longer do this.";
  }
  return "The change did not go through. Try again.";
}

type FlagControlsProps = {
  user: DossierUser;
  isSelf: boolean;
  /** Kept in the form so the action's redirect re-runs the same lookup. */
  phone: string;
};

/**
 * The Account section's controls for the found person. Writes go through the
 * account route's action (fetcher), so pending state and the dossier refetch
 * stay in the router. A staff target can only be demoted, never disabled —
 * the CLI's rail. Nobody acts on themselves.
 */
export function FlagControls({ user, isSelf, phone }: FlagControlsProps) {
  const fetcher = useFetcher<{ error?: { status: number; errorCode?: string } }>();
  const [confirming, setConfirming] = useState<FlagIntent | null>(null);
  const pending = fetcher.state !== "idle";

  if (isSelf) {
    return (
      <p className={styles.note}>
        This is your own account. To change your own flag, ask another platform admin.
      </p>
    );
  }

  const intent =
    confirming === null ? null : (
      <div className={styles.confirm} role="group" aria-label="Confirm the change">
        <p className={styles.question}>{CONFIRM_COPY[confirming].question}</p>
        <div className={styles.confirmRow}>
          <fetcher.Form method="post" action="/admin/account" onSubmit={() => setConfirming(null)}>
            <input type="hidden" name="intent" value={confirming} />
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="phone" value={phone} />
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : CONFIRM_COPY[confirming].yes}
            </Button>
            {pending ? <span className={styles.pulse} aria-hidden="true" /> : null}
          </fetcher.Form>
          <Button variant="secondary" onClick={() => setConfirming(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    );

  return (
    <div className={styles.root}>
      <p className={styles.title}>
        <span className={styles.key} aria-hidden="true">
          <GlyphKey />
        </span>
        Account controls
      </p>
      <div className={styles.row}>
        {user.platformAdmin ? (
          <Button variant="secondary" onClick={() => setConfirming("demote")} disabled={pending}>
            Demote from staff
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setConfirming("promote")} disabled={pending}>
            Promote to staff
          </Button>
        )}
        {!user.platformAdmin && user.disabled ? (
          <Button variant="secondary" onClick={() => setConfirming("enable")} disabled={pending}>
            Enable sign-in
          </Button>
        ) : null}
        {!user.platformAdmin && !user.disabled ? (
          <Button variant="secondary" onClick={() => setConfirming("disable")} disabled={pending}>
            Disable sign-in
          </Button>
        ) : null}
      </div>
      {user.platformAdmin ? (
        <p className={styles.note}>A staff account can only be demoted here, never disabled.</p>
      ) : null}
      {intent}
      {fetcher.data?.error ? (
        <p className={styles.error} role="alert">
          {flagErrorMessage(fetcher.data.error)}
        </p>
      ) : null}
    </div>
  );
}
