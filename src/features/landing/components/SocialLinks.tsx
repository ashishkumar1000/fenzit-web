import { useId, type CSSProperties } from "react";
import { FACEBOOK_URL, INSTAGRAM_URL, LINKEDIN_URL } from "../../../config/contact";
import styles from "./SocialLinks.module.css";

/*
 * Brand marks. lucide-react has no brand icons, so these are raw SVG graphics.
 * The colours are each company's own logo colours, not Fenzit design tokens, so
 * they are fixed here on purpose. The glyph cut-outs are white, as on the logos.
 */
const BRAND = {
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  glyph: "#FFFFFF",
};

const glyph: CSSProperties = { fill: BRAND.glyph };
const glyphOutline: CSSProperties = {
  fill: "none",
  stroke: BRAND.glyph,
  strokeWidth: 2,
};

function LinkedInMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="24" height="24" rx="4" fill={BRAND.linkedin} />
      <rect x="5" y="9" width="3" height="10" style={glyph} />
      <circle cx="6.5" cy="5.5" r="1.9" style={glyph} />
      <path
        d="M10 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 3.5 2 3.5 4.5V19h-3v-5c0-1.2 0-2.7-1.7-2.7s-1.9 1.3-1.9 2.6V19h-3V9z"
        style={glyph}
      />
    </svg>
  );
}

function InstagramMark() {
  // A unique id per copy, so two icons on one page never share a gradient.
  const gradientId = `ig-${useId().replace(/:/g, "")}`;
  return (
    <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#F58529" />
          <stop offset="0.5" stopColor="#DD2A7B" />
          <stop offset="0.75" stopColor="#8134AF" />
          <stop offset="1" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <rect x="5" y="5" width="14" height="14" rx="4" style={glyphOutline} />
      <circle cx="12" cy="12" r="3.2" style={glyphOutline} />
      <circle cx="15.9" cy="8.1" r="1" style={glyph} />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="24" height="24" rx="4" fill={BRAND.facebook} />
      <path
        d="M13.5 20v-6.5h2.2l.4-2.6h-2.6V9.2c0-.7.3-1.3 1.4-1.3h1.3V5.6c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2h-2.3v2.6h2.3V20z"
        style={glyph}
      />
    </svg>
  );
}

const LINKS = [
  { label: "Fenzit on LinkedIn (opens in a new tab)", href: LINKEDIN_URL, Mark: LinkedInMark },
  { label: "Fenzit on Instagram (opens in a new tab)", href: INSTAGRAM_URL, Mark: InstagramMark },
  { label: "Fenzit on Facebook (opens in a new tab)", href: FACEBOOK_URL, Mark: FacebookMark },
];

/** The three company social icons. Each opens its page in a new tab. */
export function SocialLinks() {
  return (
    <div className={styles.row} role="group" aria-label="Social media">
      {LINKS.map(({ label, href, Mark }) => (
        <a
          key={label}
          className={styles.socialLink}
          href={href}
          rel="noopener noreferrer"
          target="_blank"
          aria-label={label}
        >
          <Mark />
        </a>
      ))}
    </div>
  );
}
