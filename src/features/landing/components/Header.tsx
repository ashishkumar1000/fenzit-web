import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.mark}>
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 25V9.5A1.5 1.5 0 0 1 13.5 8H22.5"
              stroke="currentColor"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 16H19.5" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" />
            <circle className={styles.node} cx="24.5" cy="8" r="2.6" />
          </svg>
        </span>
        <span className={styles.word}>Fenzit</span>
      </div>
      <span className={styles.badge}>Launching 2026</span>
    </header>
  );
}
