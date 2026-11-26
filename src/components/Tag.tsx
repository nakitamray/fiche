import type { Stamp as StampKind } from "@/lib/ast";

/** small cardstock flag, like the ones on brass clips in a pastry case */
export function Tag({
  children,
  tone = "card",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "card" | "glaze" | "bottle";
  className?: string;
}) {
  const tones = {
    card: "bg-card text-glaze border-[#e6d8c0]",
    glaze: "text-[#fbe9d7] border-glaze-deep bg-[linear-gradient(180deg,#a83d34,#86291f)]",
    bottle: "text-[#eef0e2] border-bottle-deep bg-[linear-gradient(180deg,#45614e,#2c4436)]",
  };
  return (
    <span className={`label inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1 leading-tight shadow-tag ${tones[tone]} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brass-light to-brass-deep" />
      {children}
    </span>
  );
}

/** cookie-cutter stamp, pressed slightly crooked: tested / house special / sold out */
export function Stamp({ kind, className = "" }: { kind: StampKind; className?: string }) {
  const color = kind === "tested" ? "#2f4a3b" : "#93302a";
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
      <g filter="url(#ink-rough)" opacity="0.85">
        <circle cx="60" cy="60" r="56" fill="#fcf3e3" opacity="0.6" />
        <path
          d={
            Array.from({ length: 97 }, (_, i) => {
              const a = (i / 96) * Math.PI * 2;
              const r = 54 - 2.4 * (0.5 - 0.5 * Math.cos(a * 18));
              return `${i ? "L" : "M"}${(60 + r * Math.cos(a)).toFixed(1)},${(60 + r * Math.sin(a)).toFixed(1)}`;
            }).join("") + "Z"
          }
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        <circle cx="60" cy="60" r="44" fill="none" stroke={color} strokeWidth="1.4" />
        <text fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2.4" fill={color}>
          <textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">
            FICHE · MAISON
          </textPath>
        </text>
        {kind === "house special" ? (
          <>
            <text x="60" y="64" textAnchor="middle" fontFamily="var(--font-script)" fontSize="24" fill={color}>
              house
            </text>
            <text x="60" y="84" textAnchor="middle" fontFamily="var(--font-script)" fontSize="24" fill={color}>
              special
            </text>
          </>
        ) : (
          <text x="60" y="72" textAnchor="middle" fontFamily="var(--font-script)" fontSize="28" fill={color}>
            {kind}
          </text>
        )}
      </g>
    </svg>
  );
}
