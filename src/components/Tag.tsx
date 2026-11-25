import type { Stamp as StampKind } from "@/lib/ast";

/** the little folded card you'd find stuck into a tray in a pastry case */
export function Tag({
  children,
  tone = "card",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "card" | "ox" | "green";
  className?: string;
}) {
  const tones = {
    card: "bg-[#fbf6ea] text-oxblood border-[#e4d6bd]",
    ox: "bg-oxblood text-[#f6ead6] border-oxblood-deep",
    green: "bg-awning text-[#f0e6cf] border-awning-deep",
  };
  return (
    <span
      className={`label inline-block border px-2 py-1 leading-tight shadow-tag ${tones[tone]} ${className}`}
      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 6px 100%, 0 calc(100% - 6px))" }}
    >
      {children}
    </span>
  );
}

/** rotated cookie-cutter stamp for tested / house special / sold out */
export function Stamp({ kind, className = "", light = false }: { kind: StampKind; className?: string; light?: boolean }) {
  const color = light ? "#f6ead6" : kind === "tested" ? "#3b4d3b" : "#6b2428";
  const rot = kind === "tested" ? -9 : kind === "house special" ? 7 : -4;
  return (
    <svg viewBox="0 0 120 120" className={`pointer-events-none ${className}`} style={{ transform: `rotate(${rot}deg)` }} aria-label={kind}>
      <defs>
        <path id={`arc-${kind.replace(" ", "-")}`} d="M 24 60 A 36 36 0 1 1 96 60" />
        <filter id="rough">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </defs>
      <g filter="url(#rough)" opacity="0.92">
        {/* scalloped cutter edge */}
        <path
          d={Array.from({ length: 49 }, (_, i) => {
            const a = (i / 48) * Math.PI * 2;
            const r = 54 - 2.6 * (0.5 - 0.5 * Math.cos(a * 16));
            return `${i ? "L" : "M"}${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
          }).join("") + "Z"}
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        <circle cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="1.6" />
        <text fontFamily="var(--font-mono)" fontSize="9.5" letterSpacing="2.4" fill={color}>
          <textPath href={`#arc-${kind.replace(" ", "-")}`} startOffset="50%" textAnchor="middle">
            {kind === "house special" ? "MAISON · FICHE" : "FICHE · MAISON"}
          </textPath>
        </text>
        <text
          x="60"
          y={kind === "house special" ? 62 : 66}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize={kind === "house special" ? 17 : 20}
          fill={color}
        >
          {kind === "house special" ? "house" : kind === "sold out" ? "sold out" : "tested"}
        </text>
        {kind === "house special" && (
          <text x="60" y="80" textAnchor="middle" fontFamily="var(--font-display)" fontSize="17" fill={color}>
            special
          </text>
        )}
      </g>
    </svg>
  );
}
