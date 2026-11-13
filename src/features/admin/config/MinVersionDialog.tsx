import { useCallback, useRef, type KeyboardEvent } from "react";
import { Button } from "../../../components/ui/Button";
import type { MinVersionRefusal } from "./configRules";
import styles from "./MinVersionDialog.module.css";

interface MinVersionDialogProps {
  refusal: MinVersionRefusal;
  /** What the admin typed, shown back so they can see what was refused. */
  enteredValue: string;
  /** Put the live version in the field. The admin still saves afterwards. */
  onUseLive: (live: string) => void;
  /** Close and keep the form as it is. Nothing is sent. */
  onClose: () => void;
}

/** Everything a keyboard user can land on inside the dialog. */
const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/** The dialog holds focus while it is open, so screen readers and keyboards start inside it. */
function focusOnOpen(element: HTMLDivElement | null, previous: { current: HTMLElement | null }) {
  if (element === null) return;
  previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  element.focus();
}

const TITLE_ID = "min-version-dialog-title";
const BODY_ID = "min-version-dialog-body";

/**
 * Plain-English popup for a minimum version that cannot be saved. It says why,
 * and offers the live version as the safe choice. Escape or "Keep my entry"
 * closes it without sending anything.
 */
export function MinVersionDialog({
  refusal,
  enteredValue,
  onUseLive,
  onClose,
}: MinVersionDialogProps) {
  // The element that had focus before the dialog opened; focus returns there on close.
  const previousFocus = useRef<HTMLElement | null>(null);
  // A stable callback: an inline one would run again on every render and pull focus back.
  const attachDialog = useCallback((element: HTMLDivElement | null) => {
    focusOnOpen(element, previousFocus);
  }, []);

  const close = () => {
    previousFocus.current?.focus();
    onClose();
  };
  const chooseLive = (live: string) => {
    previousFocus.current?.focus();
    onUseLive(live);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (event.key === "Tab") {
      // Keep Tab inside the dialog, wrapping from the last control to the first.
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (first === undefined || last === undefined) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const isAboveLive = refusal.kind === "above-live";
  const title = isAboveLive
    ? "This version isn't on Google Play yet"
    : "Enter a version like 1.4.0";
  const why = isAboveLive
    ? `You entered ${enteredValue}. The latest version live on Google Play is ${refusal.live}. Anyone on an older version would be stopped with no update to install.`
    : `"${enteredValue}" is not a version number. Use three numbers with dots, like 1.4.0.`;
  const recommendation = isAboveLive
    ? `Use ${refusal.live}, the version users can install now. To set ${enteredValue}, release it on Google Play first, then come back here.`
    : "Type three numbers with dots, like 1.4.0.";

  return (
    <div className={styles.overlay} onKeyDown={onKeyDown}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        tabIndex={-1}
        // Focus the dialog as it opens, so a keyboard or screen reader user lands in it.
        ref={attachDialog}
        className={styles.dialog}
      >
        <h3 id={TITLE_ID} className={styles.title}>
          {title}
        </h3>
        <div id={BODY_ID} className={styles.body}>
          <p className={styles.text}>{why}</p>
          <p className={styles.recommendation}>
            <span className={styles.label}>What to do: </span>
            {recommendation}
          </p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={close}>
            Keep my entry
          </Button>
          {refusal.kind === "above-live" && (
            <Button onClick={() => chooseLive(refusal.live)}>Use {refusal.live}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
