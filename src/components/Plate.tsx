import { useId } from "react";
import type { PastryShape, PlateStyle } from "@/lib/ast";

/**
 * Overhead plate + pastry, drawn in SVG so it scales and recolours cleanly.
 * viewBox is 200×200, plate centred at (100,100).
 */

const PLATE: Record<PlateStyle, { body: string; well: string; rim?: string; detail?: "dots" | "double" | "willow" | "ridges" | "fluted" | "bands" }> = {
  plain: { body: "#f7f3ec", well: "#fbf8f3" },
  green: { body: "#4d6b3c", well: "#5b7a48", rim: "#3f5a31" },
  sprig: { body: "#f4efe4", well: "#f9f6ef", rim: "#6f8a5b", detail: "dots" },
  rimmed: { body: "#f5f0e6", well: "#faf7f1", rim: "#3e7a4a", detail: "double" },
  willow: { body: "#eef1f6", well: "#f7f8fb", rim: "#5b78b5", detail: "willow" },
  butter: { body: "#f0d987", well: "#f3df95", rim: "#e3c86b", detail: "ridges" },
  fluted: { body: "#f8f5ef", well: "#fcfaf6", detail: "fluted" },
  banded: { body: "#f6edd8", well: "#f9f2e2", rim: "#3c5c9b", detail: "bands" },
  sky: { body: "#b9cbe0", well: "#c6d6e8", rim: "#a8bcd5" },
};

function flutedPath(r: number, bumps: number, depth: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= bumps * 8; i++) {
    const a = (i / (bumps * 8)) * Math.PI * 2;
    const rr = r - depth * (0.5 - 0.5 * Math.cos(a * bumps));
    pts.push(`${(100 + rr * Math.cos(a)).toFixed(2)},${(100 + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

function PlateBody({ style, id }: { style: PlateStyle; id: string }) {
  const p = PLATE[style];
  return (
    <g>
      <ellipse cx="103" cy="106" rx="84" ry="84" fill="rgba(30,20,10,0.28)" filter={`url(#${id}-blur)`} />
      {p.detail === "fluted" ? (
        <path d={flutedPath(84, 22, 3)} fill={p.body} />
      ) : (
        <circle cx="100" cy="100" r="84" fill={p.body} />
      )}
      {p.rim && <circle cx="100" cy="100" r="83" fill="none" stroke={p.rim} strokeWidth="1.5" opacity="0.7" />}
      {p.detail === "dots" && (
        <circle cx="100" cy="100" r="74" fill="none" stroke={p.rim} strokeWidth="5" strokeDasharray="1.5 6" strokeLinecap="round" />
      )}
      {p.detail === "double" && (
        <>
          <circle cx="100" cy="100" r="76" fill="none" stroke={p.rim} strokeWidth="2.2" />
          <circle cx="100" cy="100" r="71" fill="none" stroke={p.rim} strokeWidth="0.8" />
        </>
      )}
      {p.detail === "willow" && (
        <>
          <circle cx="100" cy="100" r="74" fill="none" stroke={p.rim} strokeWidth="13" strokeDasharray="2 3 6 2" opacity="0.55" />
          <circle cx="100" cy="100" r="81" fill="none" stroke={p.rim} strokeWidth="1.2" />
          <circle cx="100" cy="100" r="66" fill="none" stroke={p.rim} strokeWidth="0.8" />
        </>
      )}
      {p.detail === "ridges" &&
        [80, 76, 72, 68].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#d9bc5c" strokeWidth="0.8" opacity="0.7" />)}
      {p.detail === "bands" &&
        [78, 74, 70].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={p.rim} strokeWidth="1.6" />)}
      {p.detail === "fluted" && <path d={flutedPath(66, 22, 1.5)} fill="none" stroke="#e6dfd2" strokeWidth="1" />}
      <circle cx="100" cy="100" r="62" fill={p.well} />
      <circle cx="100" cy="100" r="62" fill={`url(#${id}-well)`} />
      <circle cx="100" cy="100" r="84" fill={`url(#${id}-sheen)`} />
    </g>
  );
}

function Crumb({ id }: { id: string }) {
  return (
    <defs>
      <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <radialGradient id={`${id}-well`} cx="0.42" cy="0.38" r="0.7">
        <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="1" stopColor="#000" stopOpacity="0.06" />
      </radialGradient>
      <radialGradient id={`${id}-sheen`} cx="0.3" cy="0.25" r="0.9">
        <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.08" />
      </radialGradient>
      <radialGradient id={`${id}-bake`} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#d99a4e" />
        <stop offset="0.6" stopColor="#b0662a" />
        <stop offset="1" stopColor="#7d4217" />
      </radialGradient>
      <radialGradient id={`${id}-pale`} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ebc07a" />
        <stop offset="0.7" stopColor="#c98a42" />
        <stop offset="1" stopColor="#9a5d24" />
      </radialGradient>
      <radialGradient id={`${id}-choc`} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#5a3420" />
        <stop offset="1" stopColor="#24130b" />
      </radialGradient>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#2a1608" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

function Pastry({ shape, id }: { shape: PastryShape; id: string }) {
  const bake = `url(#${id}-bake)`;
  const pale = `url(#${id}-pale)`;
  const choc = `url(#${id}-choc)`;
  const g = (children: React.ReactNode) => <g filter={`url(#${id}-shadow)`}>{children}</g>;

  switch (shape) {
    case "knot":
      return g(
        <>
          {[
            [88, 92, 26, 18, -30],
            [112, 94, 24, 19, 35],
            [100, 112, 28, 17, 5],
            [96, 100, 20, 15, 70],
          ].map(([cx, cy, rx, ry, rot], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${rot} ${cx} ${cy})`} fill={bake} stroke="#6e3a14" strokeWidth="0.6" />
          ))}
          {Array.from({ length: 22 }, (_, i) => {
            const a = i * 2.4;
            const r = 6 + ((i * 7) % 22);
            return <rect key={i} x={100 + r * Math.cos(a)} y={100 + r * Math.sin(a)} width="2.6" height="1.6" rx="0.6" fill="#f3ead8" transform={`rotate(${i * 37} ${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)})`} />;
          })}
        </>,
      );
    case "croissant": {
      const segs = [
        [100, 100, 15, 20],
        [80, 106, 12, 16],
        [120, 106, 12, 16],
        [64, 116, 9, 12],
        [136, 116, 9, 12],
        [54, 126, 6, 8],
        [146, 126, 6, 8],
      ];
      return g(
        <g transform="rotate(-28 100 100) translate(0 -8)">
          {segs.reverse().map(([cx, cy, rx, ry], i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={i > 4 ? bake : pale} stroke="#7a4416" strokeWidth="0.7" />
          ))}
          <path d="M88 92 Q100 86 112 92 M90 108 Q100 114 110 108" stroke="#f1c98a" strokeWidth="1.2" fill="none" opacity="0.7" />
        </g>,
      );
    }
    case "danish":
      return g(
        <>
          <circle cx="100" cy="100" r="36" fill={pale} stroke="#8e5422" strokeWidth="0.8" />
          <circle cx="100" cy="100" r="22" fill="#f2e1b4" />
          {[
            [92, 92], [104, 90], [112, 100], [96, 104], [108, 110], [88, 106], [100, 98], [94, 114], [114, 90],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="5.2" fill="#2f3566" />
              <circle cx={x - 1.5} cy={y - 1.5} r="1.6" fill="#8a90bf" opacity="0.7" />
            </g>
          ))}
          <circle cx="100" cy="100" r="36" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="3" strokeDasharray="1 5" />
        </>,
      );
    case "bomboloni":
      return g(
        <>
          <circle cx="100" cy="100" r="34" fill={bake} />
          <circle cx="100" cy="100" r="29" fill={choc} />
          {Array.from({ length: 16 }, (_, i) => {
            const a = i * 2.1;
            const r = 4 + ((i * 11) % 21);
            const x = 100 + r * Math.cos(a);
            const y = 100 + r * Math.sin(a);
            return <rect key={i} x={x - 4} y={y - 1} width="8" height="2.4" rx="1" fill="#efe3c8" transform={`rotate(${i * 47} ${x} ${y})`} />;
          })}
          <ellipse cx="92" cy="90" rx="9" ry="4" fill="#fff" opacity="0.18" transform="rotate(-30 92 90)" />
        </>,
      );
    case "swirl": {
      let d = "M100 100";
      for (let t = 0; t < 4.2 * Math.PI; t += 0.2) {
        const r = 2 + t * 2.4;
        d += ` L${(100 + r * Math.cos(t)).toFixed(1)} ${(100 + r * Math.sin(t)).toFixed(1)}`;
      }
      return g(
        <>
          <circle cx="100" cy="100" r="34" fill={bake} />
          <path d={d} fill="none" stroke="#5b2f10" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
          <path d={d} fill="none" stroke="#e7b06a" strokeWidth="0.8" opacity="0.6" transform="translate(-1.5 -1.5)" />
        </>,
      );
    }
    case "heart":
      return g(
        <>
          <path d="M100 126 C70 106 70 80 86 78 C95 77 100 86 100 90 C100 86 105 77 114 78 C130 80 130 106 100 126Z" fill="#c99678" />
          <path d="M100 122 C74 104 74 83 87 81 C95 80 100 88 100 92 C100 88 105 80 113 81 C126 83 126 104 100 122Z" fill="#e6b7c0" />
          <path d="M95 96 q4 -6 9 -2 q-2 6 -9 2z" fill="#9b2d3e" />
          <ellipse cx="90" cy="90" rx="6" ry="3" fill="#fff" opacity="0.3" transform="rotate(-30 90 90)" />
        </>,
      );
    case "pain":
      return g(
        <>
          <rect x="68" y="78" width="64" height="46" rx="16" fill={bake} stroke="#6e3a14" strokeWidth="0.7" />
          <path d="M74 92 Q100 84 126 92 M72 106 Q100 98 128 106" stroke="#e8b06c" strokeWidth="1.4" fill="none" opacity="0.7" />
          <ellipse cx="88" cy="88" rx="12" ry="4" fill="#fff" opacity="0.18" />
        </>,
      );
    case "tart":
      return g(
        <>
          <path d={flutedPath(30, 14, 2.5)} fill={pale} />
          <circle cx="100" cy="100" r="24" fill="#f2c94c" />
          {[[94, 96, 5], [106, 104, 4], [100, 110, 3]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#a3541c" opacity="0.6" />
          ))}
        </>,
      );
    case "slab":
      return g(
        <>
          <rect x="72" y="72" width="56" height="56" rx="4" fill={choc} />
          <path d="M76 82 L124 78 M78 100 L122 96 M80 116 L120 118" stroke="#7a4a30" strokeWidth="1" opacity="0.6" />
        </>,
      );
  }
}

export function Plate({
  plate,
  pastry,
  size = 200,
  className,
}: {
  plate: PlateStyle;
  pastry: PastryShape;
  size?: number;
  className?: string;
}) {
  const id = `p${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden>
      <Crumb id={id} />
      <PlateBody style={plate} id={id} />
      <Pastry shape={pastry} id={id} />
    </svg>
  );
}
