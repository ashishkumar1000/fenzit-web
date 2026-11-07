import { useId } from "react";
import { Button } from "../../../components/ui/Button";
import styles from "./LeaveDialog.module.css";

type LeaveDialogProps = {
  onStay: () => void;
  onLeave: () => void;
};

/** Asks before leaving with a sheet that is not imported yet. Stay is the default choice. */
export function LeaveDialog({ onStay, onLeave }: LeaveDialogProps) {
  const titleId = useId();
  const copyId = useId();
  return (
    <div className={styles.backdrop}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={copyId}
      >
        <h2 id={titleId} className={styles.title}>
          Leave this import?
        </h2>
        <p id={copyId} className={styles.copy}>
          Your sheet is not imported yet. Leaving now loses the rows you loaded and the locations
          you fetched.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onLeave}>
            Leave and lose changes
          </Button>
          <Button onClick={onStay}>Stay on this page</Button>
        </div>
      </div>
    </div>
  );
}
