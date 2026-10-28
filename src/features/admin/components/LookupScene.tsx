import styles from "./LookupScene.module.css";

/**
 * Original artwork for the empty side of the look-up card: one phone number at
 * the centre, joined to the kinds of record an exact match shows. Hand-drawn
 * on a 440×300 grid, with strokes that take the colours from the stylesheet. It
 * is decorative. The text beside it carries the meaning, so it is hidden from
 * screen readers.
 */

type Node = {
  x: number;
  y: number;
  mark: "jobs" | "alert" | "mail" | "clock" | "calendar" | "shield" | "company";
};

const NODES: Node[] = [
  { x: 70, y: 60, mark: "jobs" },
  { x: 220, y: 40, mark: "alert" },
  { x: 370, y: 60, mark: "mail" },
  { x: 70, y: 240, mark: "clock" },
  { x: 220, y: 260, mark: "calendar" },
  { x: 370, y: 240, mark: "shield" },
];

const HUB = { x: 220, y: 150 };

/** Each mark is drawn around (0, 0) and fits inside a 26px radius node. */
function Mark({ kind }: { kind: Node["mark"] }) {
  switch (kind) {
    case "jobs":
      return (
        <>
          <rect x={-9} y={-6} width={18} height={13} rx={2} />
          <path d="M-4 -6V-9H4V-6M-9 0H9" />
        </>
      );
    case "alert":
      return (
        <>
          <path d="M-7 4V-1A7 7 0 0 1 7 -1V4L9 6H-9Z" />
          <path d="M-2.5 9A2.5 2.5 0 0 0 2.5 9" />
        </>
      );
    case "mail":
      return (
        <>
          <rect x={-10} y={-7} width={20} height={14} rx={2} />
          <path d="M-10 -7L0 1L10 -7" />
        </>
      );
    case "clock":
      return (
        <>
          <circle r={9} />
          <path d="M0 -5V0L4 3" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x={-9} y={-7} width={18} height={16} rx={2} />
          <path d="M-9 -2H9M-4 -10V-5M4 -10V-5" />
        </>
      );
    case "company":
      return (
        <>
          <rect x={-7} y={-9} width={14} height={18} rx={1.5} />
          <path d="M-3 -5H-1M1 -5H3M-3 -1H-1M1 -1H3M-1 9V5H1V9" />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M0 -10L9 -6V1C9 6 5 9 0 11C-5 9 -9 6 -9 1V-6Z" />
          <path d="M-4 0L-1 3L5 -3" />
        </>
      );
  }
}

export function LookupScene() {
  return (
    <svg
      className={styles.scene}
      viewBox="0 0 440 300"
      width="100%"
      aria-hidden="true"
      focusable="false"
    >
      {/* A soft panel behind the hub, so the scene reads as one picture. */}
      <rect className={styles.panel} x={10} y={8} width={420} height={284} rx={20} />

      {/* Lines from the phone number to each record. They sit under the nodes. */}
      <g className={styles.link}>
        {NODES.map((node) => (
          <line key={node.mark} x1={HUB.x} y1={HUB.y} x2={node.x} y2={node.y} />
        ))}
      </g>

      {/* The phone number at the centre, with a match badge. */}
      <g transform={`translate(${HUB.x} ${HUB.y})`}>
        <rect className={styles.hub} x={-54} y={-32} width={108} height={64} rx={14} />
        <path className={styles.digits} d="M-36 -6H10M-36 6H-8" />
        <circle className={styles.badge} cx={40} cy={-22} r={9} />
        <path className={styles.check} d="M36 -22L39 -19L44 -25" />
      </g>

      {/* The six kinds of record. */}
      {NODES.map((node) => (
        <g key={`node-${node.mark}`} transform={`translate(${node.x} ${node.y})`}>
          <circle className={styles.node} r={26} />
          <g className={styles.mark}>
            <Mark kind={node.mark} />
          </g>
        </g>
      ))}

      {/* Small plus marks and dots, for texture. */}
      <g className={styles.sparkle}>
        <path d="M22 118H30M26 114V122" />
        <path d="M414 176H422M418 172V180" />
        <path d="M400 128H404" />
      </g>
      <circle className={styles.dot} cx={36} cy={200} r={2.5} />
      <circle className={styles.dot} cx={404} cy={96} r={2.5} />
    </svg>
  );
}

const FACTS: { kind: Node["mark"]; label: string }[] = [
  { kind: "company", label: "Companies" },
  { kind: "jobs", label: "Jobs" },
  { kind: "clock", label: "Attendance" },
  { kind: "calendar", label: "Leave" },
  { kind: "mail", label: "Invitations" },
  { kind: "alert", label: "Notifications" },
  { kind: "shield", label: "Past changes" },
];

/** The six kinds of record a match shows, each with its mark. Decorative icons: the words carry the meaning. */
export function LookupFacts() {
  return (
    <ul className={styles.facts} role="list">
      {FACTS.map((fact) => (
        <li key={fact.kind} className={styles.fact}>
          <svg
            className={styles.factIcon}
            viewBox="-12 -12 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <g className={styles.mark}>
              <Mark kind={fact.kind} />
            </g>
          </svg>
          {fact.label}
        </li>
      ))}
    </ul>
  );
}
