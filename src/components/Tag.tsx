import type { Stamp as StampKind } from "@/lib/ast";

/** the little bent-wire clip that holds a price card on its pick */
export function WireClip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 22" className={className} aria-hidden>
      <path
        d="M4 21 V5.5 a3 3 0 0 1 6 0 V16 a1.8 1.8 0 0 1 -3.6 0 V7"
        fill="none"
        stroke="#A3A8AD"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Hand-lettered price flag, the white card stuck into a pastry:
 * FORTUNE EGG FLAN, BROWN BUTTER. Flat, with a wire clip on top.
 */
export function Flag({
  children,
  tone = "card",
  tilt = 0,
  className = "",
}: {
  children: React.ReactNode;
  tone?: "card" | "ox" | "forest";
  tilt?: number;
  className?: string;
}) {
  const tones = {
    card: "border-ink bg-card",
    ox: "border-oxblood bg-oxblood text-white",
    forest: "border-forest bg-forest text-white",
  };
  return (
    <span className={`relative inline-flex pt-2 ${className}`} style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
      <WireClip className="absolute left-2 top-[-4px] h-[14px] w-[9px]" />
      <span className={`label inline-block border px-2 py-[3px] text-[11px] leading-tight ${tones[tone]}`}>{children}</span>
    </span>
  );
}

/** ink stamp pressed slightly crooked: tested / house special / sold out */
export function Stamp({ kind, className = "" }: { kind: StampKind; className?: string }) {
  const color = kind === "tested" ? "#364935" : "#6E2226";
  const rot = kind === "tested" ? -9 : kind === "house special" ? 8 : -4;
  const arc = `arc-${kind.replace(" ", "-")}`;
  return (
    <svg viewBox="0 0 120 120" className={`pointer-events-none ${className}`} style={{ transform: `rotate(${rot}deg)` }} aria-label={kind}>
      <defs>
        <path id={arc} d="M 24 60 A 36 36 0 1 1 96 60" />
        <filter id="ink-rough">
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </defs>
      <g filter="url(#ink-rough)" opacity="0.9">
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="3" />
        <circle cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="1.2" />
        <text fontFamily="var(--font-cond)" fontWeight="600" fontSize="9.5" letterSpacing="2.6" fill={color}>
          <textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">
            FICHE · BOULANGERIE
          </textPath>
        </text>
        {kind === "house special" ? (
          <>
            <text x="60" y="64" textAnchor="middle" fontFamily="var(--font-cond)" fontWeight="700" fontSize="15" letterSpacing="1" fill={color}>
              HOUSE
            </text>
            <text x="60" y="81" textAnchor="middle" fontFamily="var(--font-cond)" fontWeight="700" fontSize="15" letterSpacing="1" fill={color}>
              SPECIAL
            </text>
          </>
        ) : (
          <text x="60" y="72" textAnchor="middle" fontFamily="var(--font-cond)" fontWeight="700" fontSize="17" letterSpacing="1" fill={color}>
            {kind.toUpperCase()}
          </text>
        )}
      </g>
    </svg>
  );
}
