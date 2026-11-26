import { useId, useSyncExternalStore } from "react";
import styles from "./FenzitMark.module.css";

/**
 * The Fenzit mark's liquid-fill loader artwork (2026-11-26). The SVG was
 * authored by an external agent and supplied by the owner as
 * ~/Downloads/f-loader.svg; the four "F" piece paths were traced from the
 * 1024px brand icon. It replaces the earlier hand-traced pour build —
 * the component API (one decorative mark sized by CSS) and all wiring
 * (FenzitLoader variants, the boot fallback) are unchanged.
 *
 * Mechanics, straight from the source (all motion is SVG SMIL, running as
 * authored in the DOM — no CSS drives the fill):
 *
 *   grey shell        the four empty piece shapes always visible beneath
 *   liquid fill       the four gradient-filled pieces sit inside the
 *                     silhouette clip, revealed through a wave mask that
 *                     rises 888→164 over 4.7s one-shot (begin 0.3s,
 *                     fill=freeze, spline-eased keyTimes)
 *   back wave         the mask's half-opacity wave adds depth behind the
 *                     full-strength front wave (one wavelength = 200
 *                     units, so the ±100/±200 slosh loops seamlessly)
 *   crest line        a white stroke riding the front wave, synced to it
 *   waves             slosh horizontally (±100 back, ±200 front) forever
 *   bubbles           12 white circles rising inside the liquid forever
 *
 * Reduced motion (non-negotiable): SMIL ignores the media query, so the
 * component renders conditionally — when the user prefers reduced motion
 * the masked animated group is skipped entirely and the four coloured
 * paths render unmasked inside the clip (fully filled, static) while the
 * stylesheet's gentle opacity pulse runs on the mark. No transforms, no
 * bubbles, no waves in that branch.
 *
 * The mark is decorative: aria-hidden, no role, no title — FenzitLoader
 * owns the single role="status" announcement. Size is owned by CSS:
 * width/height follow --fenzit-mark-size (96px default); the loader sets
 * that variable per variant, and any wrapper may override it.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** matchMedia as a subscription, so the mark re-renders if the setting
 *  flips mid-session. Server snapshot is false: the animated branch is the
 *  safe default for a prerendered document. A webview without matchMedia at
 *  all also takes the animated branch — the mark must never crash boot. */
function usePrefersReducedMotion(): boolean {
  const hasMatchMedia = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  const subscribe = (onChange: () => void) => {
    if (!hasMatchMedia()) return () => {};
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  };
  return useSyncExternalStore(
    subscribe,
    () => (hasMatchMedia() ? window.matchMedia(REDUCED_MOTION_QUERY).matches : false),
    () => false,
  );
}

// The four "F" piece outlines and the waterline, verbatim from
// f-loader.svg (traced from the 1024px icon). viewBox is 130 135 760 755.
const PIECE_PATHS = {
  pBlue:
    "M478 155 L852 155 Q870 155 867 173 C853 262 788 322 703 322 L522 322 C480 322 446 352 438 398 L430 440 L300 520 L219 562 L263 335 C283 228 368 155 478 155 Z",
  pFold:
    "M522 322 C480 322 446 352 438 398 L433 424 L410 424 C320 424 252 478 226 548 L240 470 C262 380 350 322 460 322 Z",
  pCyan:
    "M412 424 L768 424 Q784 424 781 440 C766 530 700 597 612 597 L336 597 C266 597 208 640 189 704 L219 562 C241 482 314 424 412 424 Z",
  pTeal:
    "M189 704 C208 640 266 597 336 597 L432 597 C406 597 391 617 385 642 L353 768 C338 830 292 868 230 868 L164 868 Q151 868 154 855 Z",
};

// One wavelength = 200 units; sliding by 200 loops seamlessly.
const WAVE_PATH =
  "M-400 0 Q-350 -18 -300 0 T-200 0 T-100 0 T0 0 T100 0 T200 0 T300 0 T400 0 T500 0 T600 0 T700 0 T800 0 T900 0 T1000 0 T1100 0 T1200 0 T1300 0 T1400 0 L1400 1000 L-400 1000 Z";

// The rise's easing, verbatim on the mask's two wave groups and the crest.
const RISE_ANIMATE = {
  begin: "0.3s",
  dur: "4.7s",
  calcMode: "spline",
  keyTimes: "0;0.2;0.56;0.64;1",
  keySplines: "0 0 1 1;0 0 1 1;0 0 1 1;0.3 0 0.4 1",
};

// The 12 white bubbles, verbatim (position, radius, rise and stagger).
const BUBBLES: Array<{
  r: number;
  cx?: string;
  cy: [string, string];
  cxAnim?: [string, string];
  dur: string;
  begin: string;
}> = [
  { r: 6, cy: ["860", "300"], cxAnim: ["210", "330"], dur: "3.2s", begin: "0.2s" },
  { r: 4, cy: ["850", "330"], cxAnim: ["260", "370"], dur: "2.6s", begin: "1.1s" },
  { r: 5, cy: ["800", "440"], cxAnim: ["300", "380"], dur: "2.4s", begin: "0.6s" },
  { r: 3, cy: ["840", "600"], cxAnim: ["190", "240"], dur: "1.8s", begin: "1.6s" },
  { r: 4, cy: ["520", "190"], cxAnim: ["330", "360"], dur: "2s", begin: "2.5s" },
  { r: 3, cx: "450", cy: ["590", "440"], dur: "1.3s", begin: "0.9s" },
  { r: 5, cx: "520", cy: ["590", "430"], dur: "1.6s", begin: "1.8s" },
  { r: 4, cx: "650", cy: ["585", "435"], dur: "1.4s", begin: "2.3s" },
  { r: 3, cx: "720", cy: ["520", "440"], dur: "1.1s", begin: "2.9s" },
  { r: 5, cx: "580", cy: ["315", "180"], dur: "1.7s", begin: "3.1s" },
  { r: 4, cx: "700", cy: ["310", "185"], dur: "1.5s", begin: "3.6s" },
  { r: 3, cx: "800", cy: ["280", "190"], dur: "1.2s", begin: "3.9s" },
];

export function FenzitMark({ className }: { className?: string }) {
  // useId can contain characters that are unsafe in url(#…) references, so
  // strip to the alphanumeric core; two instances on one page still differ
  // (every id the artwork references is namespaced — including the ones
  // <use href> resolves, which would otherwise bind to the document's
  // first match and cross-link two loaders).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pBlueId = `fz-pblue-${uid}`;
  const pFoldId = `fz-pfold-${uid}`;
  const pCyanId = `fz-pcyan-${uid}`;
  const pTealId = `fz-pteal-${uid}`;
  const waveId = `fz-wave-${uid}`;
  const gBlueId = `fz-gblue-${uid}`;
  const gFoldId = `fz-gfold-${uid}`;
  const gCyanId = `fz-gcyan-${uid}`;
  const gTealId = `fz-gteal-${uid}`;
  const fClipId = `fz-fclip-${uid}`;
  const liquidId = `fz-liquid-${uid}`;
  const reducedMotion = usePrefersReducedMotion();

  return (
    <svg
      viewBox="130 135 760 755"
      className={className === undefined ? styles.mark : `${styles.mark} ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* F pieces, traced from the 1024px icon */}
        <path id={pBlueId} d={PIECE_PATHS.pBlue} />
        <path id={pFoldId} d={PIECE_PATHS.pFold} />
        <path id={pCyanId} d={PIECE_PATHS.pCyan} />
        <path id={pTealId} d={PIECE_PATHS.pTeal} />

        {/* one wavelength = 200 units; sliding by 200 loops seamlessly */}
        <path id={waveId} d={WAVE_PATH} />

        <linearGradient id={gBlueId} gradientUnits="userSpaceOnUse" x1={260} y1={0} x2={868} y2={0}>
          <stop offset="0" stopColor="#0a1cae" />
          <stop offset=".5" stopColor="#0b4ef0" />
          <stop offset="1" stopColor="#2a90ff" />
        </linearGradient>
        <linearGradient
          id={gFoldId}
          gradientUnits="userSpaceOnUse"
          x1={480}
          y1={330}
          x2={240}
          y2={540}
        >
          <stop offset="0" stopColor="#011a8c" />
          <stop offset="1" stopColor="#000a5e" />
        </linearGradient>
        <linearGradient id={gCyanId} gradientUnits="userSpaceOnUse" x1={190} y1={0} x2={781} y2={0}>
          <stop offset="0" stopColor="#86eefd" />
          <stop offset=".35" stopColor="#5ad8fb" />
          <stop offset=".65" stopColor="#14b0fc" />
          <stop offset="1" stopColor="#52e4f6" />
        </linearGradient>
        <linearGradient id={gTealId} gradientUnits="userSpaceOnUse" x1={0} y1={600} x2={0} y2={868}>
          <stop offset="0" stopColor="#08606a" />
          <stop offset="1" stopColor="#00c9bb" />
        </linearGradient>

        <clipPath id={fClipId}>
          <use href={`#${pBlueId}`} />
          <use href={`#${pCyanId}`} />
          <use href={`#${pTealId}`} />
        </clipPath>
      </defs>

      {reducedMotion ? (
        // Reduced motion: fully filled, static, unmasked — the coloured
        // artwork simply stands in the silhouette while the stylesheet's
        // opacity pulse runs. No transforms, no bubbles, no waves.
        <g clipPath={`url(#${fClipId})`}>
          <use href={`#${pBlueId}`} fill={`url(#${gBlueId})`} />
          <use href={`#${pFoldId}`} fill={`url(#${gFoldId})`} />
          <use href={`#${pCyanId}`} fill={`url(#${gCyanId})`} />
          <use href={`#${pTealId}`} fill={`url(#${gTealId})`} />
        </g>
      ) : (
        <>
          {/* liquid: white = coloured. Back wave at half strength gives
              depth. The mask rides its own one-shot rise while the waves
              inside slosh forever. It lives here — not in defs — so the
              reduced-motion branch carries no SMIL at all. */}
          <mask
            id={liquidId}
            maskUnits="userSpaceOnUse"
            x={-500}
            y={-200}
            width={2000}
            height={1400}
          >
            <g transform="translate(0 888)">
              <animateTransform
                attributeName="transform"
                type="translate"
                begin={RISE_ANIMATE.begin}
                dur={RISE_ANIMATE.dur}
                fill="freeze"
                calcMode={RISE_ANIMATE.calcMode}
                keyTimes={RISE_ANIMATE.keyTimes}
                keySplines={RISE_ANIMATE.keySplines}
                values="0 888;0 588;0 413;0 318;0 164"
              />
              <use href={`#${waveId}`} fill="#fff" fillOpacity=".5">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="-100 0;100 0"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </use>
            </g>
            <g transform="translate(0 900)">
              <animateTransform
                attributeName="transform"
                type="translate"
                begin={RISE_ANIMATE.begin}
                dur={RISE_ANIMATE.dur}
                fill="freeze"
                calcMode={RISE_ANIMATE.calcMode}
                keyTimes={RISE_ANIMATE.keyTimes}
                keySplines={RISE_ANIMATE.keySplines}
                values="0 900;0 600;0 425;0 330;0 178"
              />
              <use href={`#${waveId}`} fill="#fff">
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0;-200 0"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </use>
            </g>
          </mask>

          {/* empty grey shell */}
          <use href={`#${pBlueId}`} fill="#dfe3e8" />
          <use href={`#${pFoldId}`} fill="#c8cdd4" />
          <use href={`#${pCyanId}`} fill="#ebedf0" />
          <use href={`#${pTealId}`} fill="#d3d7dd" />

          {/* coloured icon, revealed by the liquid */}
          <g clipPath={`url(#${fClipId})`}>
            <g mask={`url(#${liquidId})`}>
              <use href={`#${pBlueId}`} fill={`url(#${gBlueId})`} />
              <use href={`#${pFoldId}`} fill={`url(#${gFoldId})`} />
              <use href={`#${pCyanId}`} fill={`url(#${gCyanId})`} />
              <use href={`#${pTealId}`} fill={`url(#${gTealId})`} />

              <g fill="#fff" fillOpacity=".3" stroke="#fff" strokeOpacity=".85" strokeWidth={2}>
                {BUBBLES.map((bubble, index) => (
                  <circle key={index} r={bubble.r} cx={bubble.cx}>
                    <animate
                      attributeName="cy"
                      values={bubble.cy.join(";")}
                      dur={bubble.dur}
                      begin={bubble.begin}
                      repeatCount="indefinite"
                    />
                    {bubble.cxAnim !== undefined ? (
                      <animate
                        attributeName="cx"
                        values={bubble.cxAnim.join(";")}
                        dur={bubble.dur}
                        begin={bubble.begin}
                        repeatCount="indefinite"
                      />
                    ) : null}
                  </circle>
                ))}
              </g>
            </g>

            {/* shine along the wave crest, synced with the front wave */}
            <g transform="translate(0 900)">
              <animateTransform
                attributeName="transform"
                type="translate"
                begin={RISE_ANIMATE.begin}
                dur={RISE_ANIMATE.dur}
                fill="freeze"
                calcMode={RISE_ANIMATE.calcMode}
                keyTimes={RISE_ANIMATE.keyTimes}
                keySplines={RISE_ANIMATE.keySplines}
                values="0 900;0 600;0 425;0 330;0 178"
              />
              <use
                href={`#${waveId}`}
                fill="none"
                stroke="#fff"
                strokeOpacity=".55"
                strokeWidth={4}
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0 0;-200 0"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </use>
            </g>
          </g>
        </>
      )}
    </svg>
  );
}
