import { BadgeCheck, ExternalLink } from "lucide-react";
import { DPIIT_RECOGNITION } from "../../config/recognition";
// TEMPORARY, LOCAL TEST ONLY. See the note where the wordmark is rendered.
import startupIndiaWordmark from "../../assets/brand/startupindia-wordmark.LOCAL-TEST.png";
import styles from "./DpiitBadge.module.css";

type DpiitBadgeProps = {
  /** "chip" is one line for the footer. "card" is the larger trust card with a verify link. */
  variant?: "chip" | "card";
};

/**
 * The company's DPIIT Startup India recognition, as text. It uses our own icon and our own
 * colours. It does not use the government emblem or the Startup India logo, which need
 * permission to reuse.
 */
export function DpiitBadge({ variant = "chip" }: DpiitBadgeProps) {
  const { certificateNo, year, verifyUrl } = DPIIT_RECOGNITION;
  const detail = `Recognition No. ${certificateNo} · ${year}`;

  if (variant === "card") {
    return (
      <article className={styles.card} aria-labelledby="dpiit-card-title">
        <span className={styles.seal} aria-hidden="true">
          <BadgeCheck className={styles.sealIcon} focusable="false" />
        </span>
        <div className={styles.cardBody}>
          {/* TEMPORARY, LOCAL TEST ONLY: Startup India wordmark. Remove or replace before any
              commit or deploy. Permission to publish it has not been confirmed in writing. */}
          <img
            className={styles.wordmark}
            src={startupIndiaWordmark}
            width={120}
            height={27}
            alt="Startup India"
          />
          <p id="dpiit-card-title" className={styles.cardTitle}>
            DPIIT Recognised Startup
          </p>
          <p className={styles.detail}>{detail}</p>
          <p className={styles.note}>
            Recognised as a startup by the Department for Promotion of Industry and Internal Trade
            (DPIIT), Government of India.
          </p>
          {verifyUrl && (
            <a className={styles.verify} href={verifyUrl} target="_blank" rel="noopener noreferrer">
              Verify on Startup India
              <ExternalLink className={styles.verifyIcon} aria-hidden="true" focusable="false" />
              <span className={styles.srOnly}> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </article>
    );
  }

  const body = (
    <>
      <BadgeCheck className={styles.icon} aria-hidden="true" focusable="false" />
      <span className={styles.text}>
        {/* TEMPORARY, LOCAL TEST ONLY: same Startup India wordmark as the card. Remove or replace
            before any commit or deploy. */}
        <img
          className={styles.chipWordmark}
          src={startupIndiaWordmark}
          width={72}
          height={16}
          alt="Startup India"
        />
        <span className={styles.label}>DPIIT Recognised Startup</span>
        <span className={styles.detail}>{detail}</span>
      </span>
    </>
  );

  if (verifyUrl) {
    return (
      <a
        className={`${styles.chip} ${styles.link}`}
        href={verifyUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {body}
        <span className={styles.srOnly}> (opens in a new tab)</span>
      </a>
    );
  }

  return <div className={styles.chip}>{body}</div>;
}
