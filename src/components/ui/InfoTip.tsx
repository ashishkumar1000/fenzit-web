import type { ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import styles from "./InfoTip.module.css";

type InfoTipProps = {
  /** Names the icon for screen readers and becomes the tooltip's bold heading. */
  label: string;
  /** The plain-English explanation, shown on hover, keyboard focus or tap. */
  children: ReactNode;
};

/**
 * A small info icon that reveals a short explanation on hover, keyboard
 * focus or tap. The tooltip opens above the icon; on reveal it checks which
 * side of the icon has more room and anchors there, so a tip near the page's
 * right edge grows leftward instead of clipping. The tip itself never catches
 * the pointer while it is merely hovered; a tip pinned open by a tap is
 * hoverable and closes on Escape or a second tap.
 */
export function InfoTip({ label, children }: InfoTipProps) {
  const tipId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [flip, setFlip] = useState(false);
  const [open, setOpen] = useState(false);

  // Reads only refs and window, so one stable identity serves the listener.
  const syncFlip = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const roomRight = window.innerWidth - rect.left;
    const roomLeft = rect.right;
    setFlip(roomLeft > roomRight);
  }, []);

  // A pinned tip must be dismissible even after the pointer has wandered onto
  // it, so Escape is heard on the window, not on the button (found in review
  // 2026-11-25, WCAG 1.4.13).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // A resize can pull the viewport edge under a showing tip — hovered or
  // pinned — and hover visibility is CSS-only, so the flip is re-checked for
  // the component's whole life (found in review 2026-11-25).
  useEffect(() => {
    window.addEventListener("resize", syncFlip);
    return () => window.removeEventListener("resize", syncFlip);
  }, [syncFlip]);

  return (
    <span
      className={open ? `${styles.wrap} ${styles.open}` : styles.wrap}
      ref={wrapRef}
      onMouseEnter={syncFlip}
      onFocus={syncFlip}
    >
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        aria-describedby={tipId}
        onClick={() => {
          if (!open) syncFlip();
          setOpen(!open);
        }}
      >
        <Info size={13} strokeWidth={2} aria-hidden="true" focusable="false" />
      </button>
      <span
        id={tipId}
        role="tooltip"
        className={flip ? `${styles.tip} ${styles.tipEnd}` : styles.tip}
      >
        <strong className={styles.tipTitle}>{label}</strong>
        {children}
      </span>
    </span>
  );
}
