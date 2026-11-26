"use client";

import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

/**
 * The room. Arched window on the left with the shade half down, afternoon
 * sun across the floor, banquette, bistro table, a red tiled counter with
 * the machine on it, and two empty brass mirrors on the wall — the page
 * writes the menu into those (see MenuMirror).
 *
 * viewBox 1200×640. Layers drift a few px with the pointer for depth.
 */

export const SCENE_W = 1200;
export const SCENE_H = 640;

/** where the two mirrors sit, in scene units, so overlays can line up */
export const MIRRORS = [
  { x: 548, y: 84, w: 212, h: 246 },
  { x: 782, y: 84, w: 212, h: 246 },
];

function useParallax(px: MotionValue<number>, py: MotionValue<number>, depth: number) {
  const x = useTransform(px, (v) => v * depth);
  const y = useTransform(py, (v) => v * depth * 0.5);
  return { x, y };
}

function Defs() {
  return (
    <defs>
      <linearGradient id="wall" x1="0" y1="0" x2="1" y2="0.4">
        <stop offset="0" stopColor="#f4e6cf" />
        <stop offset="0.45" stopColor="#e9d4b3" />
        <stop offset="1" stopColor="#d2b48a" />
      </linearGradient>
      <linearGradient id="outside" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff8e6" />
        <stop offset="0.6" stopColor="#ffe7b8" />
        <stop offset="1" stopColor="#f3cf93" />
      </linearGradient>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3e6cf" />
        <stop offset="1" stopColor="#e6d3b2" />
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9c2a0" />
        <stop offset="1" stopColor="#c4a57d" />
      </linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff1cf" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="tileGloss" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd0b8" stopOpacity="0.35" />
        <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.25" />
      </linearGradient>
      <linearGradient id="marbleTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf6ee" />
        <stop offset="1" stopColor="#dcd0bf" />
      </linearGradient>
      <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8b8a86" />
        <stop offset="0.25" stopColor="#f4f1ea" />
        <stop offset="0.55" stopColor="#a9a59c" />
        <stop offset="0.8" stopColor="#e8e2d6" />
        <stop offset="1" stopColor="#7d7a73" />
      </linearGradient>
      <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f3dc9e" />
        <stop offset="0.5" stopColor="#b8904a" />
        <stop offset="1" stopColor="#7a5a28" />
      </linearGradient>
      <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7a4d2c" />
        <stop offset="0.5" stopColor="#a8713f" />
        <stop offset="1" stopColor="#6a4022" />
      </linearGradient>
      <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffd18a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="vignette" cx="0.4" cy="0.35" r="0.85">
        <stop offset="0.5" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#3a1f0c" stopOpacity="0.5" />
      </radialGradient>
      <linearGradient id="cushion" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9a3a30" />
        <stop offset="1" stopColor="#5e1f1a" />
      </linearGradient>
      <pattern id="rug" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="28" height="28" fill="#7d2620" />
        <rect x="4" y="4" width="20" height="20" fill="none" stroke="#c46a4a" strokeWidth="2" />
        <rect x="11" y="11" width="6" height="6" fill="#e2b48a" />
      </pattern>
      <pattern id="pillow" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#d9b9a0" />
        <path d="M0 5 Q2.5 1 5 5 T10 5" stroke="#9a3a30" strokeWidth="1.6" fill="none" />
      </pattern>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" />
      </filter>
      <filter id="softer" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="22" />
      </filter>
      <filter id="far" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <filter id="dof" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <clipPath id="windowGlass">
        <path d="M90 230 A170 175 0 0 1 430 230 L430 470 L90 470 Z" />
      </clipPath>
    </defs>
  );
}

function Window() {
  const cols = [90, 175, 260, 345, 430];
  const rows = [230, 290, 350, 410, 470];
  return (
    <g>
      {/* reveal / thick wall */}
      <path d="M72 230 A188 192 0 0 1 448 230 L448 482 L72 482 Z" fill="#e7d3b3" />
      <path d="M80 230 A180 184 0 0 1 440 230 L440 476 L80 476 Z" fill="#dcc3a0" />

      {/* outside: the street, overexposed */}
      <g clipPath="url(#windowGlass)">
        <rect x="80" y="40" width="360" height="440" fill="url(#outside)" />
        <g filter="url(#far)" opacity="0.55">
          <rect x="96" y="250" width="120" height="230" fill="#e9c995" />
          <rect x="112" y="280" width="26" height="44" fill="#c49a64" />
          <rect x="160" y="280" width="26" height="44" fill="#c49a64" />
          <rect x="112" y="350" width="26" height="44" fill="#c49a64" />
          <rect x="160" y="350" width="26" height="44" fill="#c49a64" />
          <rect x="250" y="300" width="170" height="180" fill="#efd3a2" />
          <rect x="270" y="330" width="22" height="40" fill="#c9a16b" />
          <rect x="320" y="330" width="22" height="40" fill="#c9a16b" />
          <rect x="370" y="330" width="22" height="40" fill="#c9a16b" />
          <rect x="80" y="440" width="360" height="40" fill="#d7b88a" />
          {/* a café chair outside */}
          <path d="M300 440 l0 -26 l24 0 l0 26 M300 426 l24 0" stroke="#7b5634" strokeWidth="3" fill="none" />
        </g>
        {/* roman shade, half down, light glowing through the linen */}
        <g>
          <rect x="80" y="40" width="360" height="200" fill="url(#shade)" opacity="0.96" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={i} x1={80 + i * 60} y1="40" x2={80 + i * 60} y2="240" stroke="#d8c3a0" strokeWidth="1" opacity="0.6" />
          ))}
          {/* folds */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path
                d={`M80 ${200 + i * 16} Q260 ${214 + i * 16} 440 ${200 + i * 16} L440 ${214 + i * 16} Q260 ${230 + i * 16} 80 ${214 + i * 16} Z`}
                fill={i % 2 ? "#ead9bb" : "#f4e7cf"}
              />
              <path d={`M80 ${214 + i * 16} Q260 ${230 + i * 16} 440 ${214 + i * 16}`} stroke="#c8ad83" strokeWidth="1.2" fill="none" />
            </g>
          ))}
          <rect x="80" y="40" width="360" height="248" fill="#fff4d8" opacity="0.18" />
        </g>
      </g>

      {/* steel glazing bars */}
      <g stroke="#3d3a33" strokeWidth="4.5" fill="none">
        {cols.slice(1, -1).map((x) => (
          <line key={x} x1={x} y1="250" x2={x} y2="470" />
        ))}
        {rows.slice(1, -1).map((y) => (
          <line key={y} x1="90" y1={y} x2="430" y2={y} />
        ))}
        <path d="M90 470 L90 230 A170 175 0 0 1 430 230 L430 470 Z" strokeWidth="7" />
      </g>
      {/* sill */}
      <rect x="64" y="474" width="392" height="12" rx="2" fill="#efe2cb" />
      <rect x="64" y="484" width="392" height="5" fill="#c9ad86" opacity="0.6" />
    </g>
  );
}

function Banquette() {
  return (
    <g>
      <rect x="40" y="500" width="440" height="70" fill="#c9a77c" />
      <rect x="40" y="488" width="440" height="22" rx="8" fill="url(#cushion)" />
      {/* pillows */}
      {[
        [70, 452, -8],
        [150, 456, 6],
        [330, 454, -4],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x + 30} ${y + 25})`}>
          <rect x={x} y={y} width="62" height="50" rx="12" fill="url(#pillow)" />
          <rect x={x} y={y} width="62" height="50" rx="12" fill="url(#tileGloss)" opacity="0.6" />
        </g>
      ))}
    </g>
  );
}

function Lamp({ x, len }: { x: number; len: number }) {
  return (
    <g>
      <circle cx={x} cy={len + 30} r="90" fill="url(#lampGlow)" opacity="0.7" />
      <line x1={x} y1="0" x2={x} y2={len} stroke="#2e2420" strokeWidth="1.5" />
      <rect x={x - 5} y={len - 4} width="10" height="10" fill="url(#brassG)" />
      <path d={`M${x - 26} ${len + 30} Q${x - 22} ${len + 4} ${x} ${len + 4} Q${x + 22} ${len + 4} ${x + 26} ${len + 30} Z`} fill="#9c2f26" />
      <path d={`M${x - 14} ${len + 12} Q${x - 6} ${len + 6} ${x + 4} ${len + 8}`} stroke="#ffb8a0" strokeWidth="2" opacity="0.7" fill="none" />
      <ellipse cx={x} cy={len + 30} rx="26" ry="5" fill="#ffe7b0" />
    </g>
  );
}

function Counter() {
  const tiles = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 18; c++) {
      const shade = ((r * 7 + c * 13) % 5) / 40;
      tiles.push(
        <rect key={`${r}-${c}`} x={770 + c * 24} y={432 + r * 48} width="22.5" height="46.5" rx="1.5" fill={`rgb(${150 - shade * 300},${46 - shade * 60},${38 - shade * 40})`} />,
      );
    }
  }
  return (
    <g>
      {/* soft contact shadow */}
      <ellipse cx="990" cy="630" rx="260" ry="18" fill="#3a1f0c" opacity="0.28" filter="url(#soft)" />
      <rect x="766" y="428" width="440" height="212" fill="#4a1611" />
      {tiles}
      <rect x="766" y="428" width="440" height="212" fill="url(#tileGloss)" />
      {/* sun catching the tile edge */}
      <rect x="766" y="428" width="440" height="212" fill="url(#beam)" opacity="0.18" />
      {/* marble top */}
      <rect x="756" y="414" width="460" height="18" rx="2" fill="url(#marbleTop)" />
      <rect x="756" y="430" width="460" height="3" fill="#b9a88f" />

      {/* espresso machine */}
      <g>
        <rect x="1050" y="330" width="140" height="84" rx="5" fill="url(#chrome)" />
        <rect x="1050" y="330" width="140" height="12" rx="3" fill="#2d2a26" />
        <rect x="1060" y="350" width="120" height="6" fill="#9c2f26" />
        {[1080, 1140].map((gx) => (
          <g key={gx}>
            <rect x={gx - 9} y="372" width="18" height="16" rx="3" fill="#3a3632" />
            <rect x={gx - 3} y="388" width="6" height="12" fill="#6b655e" />
            <rect x={gx - 26} y="392" width="22" height="5" rx="2" fill="#2a2522" />
          </g>
        ))}
        {/* cups on top */}
        {[1066, 1086, 1106, 1126, 1146].map((cx) => (
          <path key={cx} d={`M${cx} 330 l2 -12 l12 0 l2 12 Z`} fill="#f6efe4" stroke="#d7cbb8" strokeWidth="0.8" />
        ))}
        {/* grinder */}
        <rect x="1004" y="352" width="34" height="62" rx="4" fill="#2f2a26" />
        <path d="M1006 352 L1012 318 L1030 318 L1036 352 Z" fill="#3c3530" opacity="0.85" />
      </g>

      {/* glass dome, empty — the bakes are in the case below */}
      <g>
        <ellipse cx="900" cy="412" rx="46" ry="5" fill="url(#brassG)" />
        <rect x="896" y="398" width="8" height="14" fill="url(#brassG)" />
        <ellipse cx="900" cy="398" rx="42" ry="4" fill="#c9a362" />
        <path d="M858 398 Q858 340 900 336 Q942 340 942 398" fill="#fff8ec" opacity="0.22" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
        <path d="M870 380 Q872 352 894 346" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" fill="none" />
        <circle cx="900" cy="332" r="5" fill="url(#brassG)" />
      </g>

      {/* dried flowers */}
      <g>
        <path d="M812 414 q-4 -10 0 -24 q4 14 0 24 Z" fill="#c9a882" />
        <rect x="804" y="386" width="16" height="28" rx="6" fill="#9c2f26" opacity="0.85" />
        {[-16, -6, 4, 14].map((dx, i) => (
          <g key={i}>
            <path d={`M812 388 Q${812 + dx} ${360 - i * 6} ${812 + dx * 1.6} ${342 - i * 4}`} stroke="#8a6b44" strokeWidth="1.2" fill="none" />
            <circle cx={812 + dx * 1.6} cy={342 - i * 4} r="4" fill="#e6c48a" />
          </g>
        ))}
      </g>
    </g>
  );
}

function Table() {
  return (
    <g>
      <ellipse cx="540" cy="622" rx="120" ry="14" fill="#3a1f0c" opacity="0.3" filter="url(#soft)" />
      {/* pedestal */}
      <rect x="532" y="520" width="16" height="96" fill="url(#wood)" />
      <ellipse cx="540" cy="618" rx="46" ry="8" fill="#6a4022" />
      {/* marble top */}
      <ellipse cx="540" cy="524" rx="92" ry="20" fill="#cdbfa9" />
      <ellipse cx="540" cy="519" rx="92" ry="20" fill="url(#marbleTop)" />
      {/* candle glass */}
      <rect x="560" y="494" width="16" height="22" rx="3" fill="#a3322a" opacity="0.9" />
      <ellipse cx="568" cy="497" rx="5" ry="3" fill="#ffd38a" />
      <circle cx="568" cy="496" r="16" fill="url(#lampGlow)" opacity="0.7" />
      {/* bud vase */}
      <path d="M506 516 q-8 -12 0 -26 q8 14 0 26 Z" fill="#c7d6cf" opacity="0.8" />
      <path d="M506 492 Q500 470 494 460 M506 492 Q512 472 520 466" stroke="#6b7a4a" strokeWidth="1.4" fill="none" />
      <circle cx="494" cy="459" r="3.5" fill="#f2e3c4" />
      <circle cx="520" cy="465" r="3" fill="#f2e3c4" />
      {/* bentwood chair, in front */}
      <g fill="none" stroke="#7a4a26" strokeLinecap="round">
        <path d="M640 640 L652 560" strokeWidth="7" />
        <path d="M700 640 L690 560" strokeWidth="7" />
        <ellipse cx="672" cy="558" rx="40" ry="10" fill="#9a6235" stroke="#6e3f1e" strokeWidth="3" />
        <path d="M636 556 Q630 470 672 462 Q714 470 708 556" strokeWidth="6" />
        <path d="M648 548 Q646 494 672 488 Q698 494 696 548" strokeWidth="3" />
      </g>
    </g>
  );
}

const LEAF = "M0 0 C-58 -18 -112 -86 -96 -168 C-82 -236 -26 -266 0 -252 C26 -266 82 -236 96 -168 C112 -86 58 -18 0 0 Z";
const SLITS: Array<[number, number, number, number]> = [
  [-92, -150, -26, -128], [-98, -96, -22, -86], [-74, -48, -14, -44], [-76, -206, -20, -172],
  [92, -150, 26, -128], [98, -96, 22, -86], [74, -48, 14, -44], [76, -206, 20, -172],
];

function Plant() {
  const leaves: Array<[number, number, number, number]> = [
    [40, 600, -58, 0.62],
    [120, 560, -22, 0.78],
    [200, 600, 24, 0.6],
    [70, 520, -36, 0.55],
    [170, 520, 6, 0.5],
  ];
  return (
    <g filter="url(#dof)">
      <defs>
        <mask id="monstera">
          <path d={LEAF} fill="white" />
          {SLITS.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="10" strokeLinecap="round" />
          ))}
        </mask>
        <linearGradient id="leafG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5f8550" />
          <stop offset="0.5" stopColor="#2f5230" />
          <stop offset="1" stopColor="#1d3820" />
        </linearGradient>
      </defs>
      <path d="M70 640 L86 604 L176 604 L192 640 Z" fill="#c29468" />
      <path d="M82 604 L180 604 L178 612 L84 612 Z" fill="#9c7048" />
      {leaves.map(([x, y, r, sc], i) => (
        <g key={i}>
          <path d={`M130 606 Q${(130 + x) / 2} ${y + 20} ${x} ${y}`} stroke="#3f5d34" strokeWidth="4" fill="none" />
          <g transform={`translate(${x} ${y}) rotate(${r}) scale(${sc})`}>
            <path d={LEAF} fill="url(#leafG)" mask="url(#monstera)" />
            <path d="M0 0 C 2 -80, 0 -170, 0 -240" stroke="#86a86f" strokeWidth="3" fill="none" opacity="0.7" mask="url(#monstera)" />
            {/* sun catching the top edge */}
            <path d="M-80 -200 C-60 -240 -20 -258 0 -250" stroke="#d9e6a4" strokeWidth="5" fill="none" opacity="0.5" />
          </g>
        </g>
      ))}
    </g>
  );
}

export function CafeScene({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 60, damping: 20 });
  const py = useSpring(my, { stiffness: 60, damping: 20 });
  const back = useParallax(px, py, -4);
  const mid = useParallax(px, py, -9);
  const fore = useParallax(px, py, -18);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[6px] shadow-lift"
      style={{ aspectRatio: `${SCENE_W + 40} / ${SCENE_H + 20}`, containerType: "inline-size" }}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <svg viewBox={`-20 -10 ${SCENE_W + 40} ${SCENE_H + 20}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
        <Defs />
        <motion.g style={back}>
          <rect x="-40" y="-20" width={SCENE_W + 80} height="560" fill="url(#wall)" />
          {/* picture lights over the mirrors */}
          {MIRRORS.map((m) => (
            <g key={m.x}>
              <rect x={m.x + m.w / 2 - 44} y={m.y - 30} width="88" height="7" rx="3" fill="url(#brassG)" />
              <path d={`M${m.x + m.w / 2 - 2} ${m.y - 24} l0 -14 l4 0 l0 14`} fill="url(#brassG)" />
              <path
                d={`M${m.x + m.w / 2 - 44} ${m.y - 23} L${m.x - 10} ${m.y + m.h * 0.7} L${m.x + m.w + 10} ${m.y + m.h * 0.7} L${m.x + m.w / 2 + 44} ${m.y - 23} Z`}
                fill="#fff0cc"
                opacity="0.35"
                filter="url(#soft)"
              />
              {/* the mirror's shadow on the wall */}
              <rect x={m.x + 10} y={m.y + 14} width={m.w} height={m.h} rx="24" fill="#5a3214" opacity="0.22" filter="url(#soft)" />
            </g>
          ))}
          {/* sun through the window, thrown on the wall */}
          <g opacity="0.55" filter="url(#soft)" transform="translate(440 70) skewX(-24) scale(0.9 1)">
            {[0, 1, 2, 3].map((c) =>
              [0, 1, 2].map((r) => <rect key={`${c}-${r}`} x={c * 64} y={r * 70} width="54" height="60" fill="#fff3d2" />),
            )}
          </g>
          <rect x="-40" y="540" width={SCENE_W + 80} height="120" fill="url(#floor)" />
          <path d={`M-40 540 L${SCENE_W + 40} 540`} stroke="#b49470" strokeWidth="2" />
          <Window />
          <Banquette />
        </motion.g>

        <motion.g style={mid}>
          {/* rug in perspective */}
          <path d="M360 560 L900 560 L1010 650 L250 650 Z" fill="url(#rug)" opacity="0.92" />
          <path d="M360 560 L900 560 L1010 650 L250 650 Z" fill="none" stroke="#e2b48a" strokeWidth="3" opacity="0.6" />
          {/* light pooling on the floor from the window */}
          <path d="M110 545 L450 545 L760 650 L180 650 Z" fill="#fff0c8" opacity="0.45" filter="url(#soft)" />
          <Table />
          <Counter />
          <Lamp x={1000} len={150} />
          <Lamp x={1150} len={110} />
        </motion.g>

        {/* long beams from the window across the room */}
        <g opacity="0.38" style={{ mixBlendMode: "screen" }}>
          <path d="M120 90 L440 230 L1100 640 L620 640 Z" fill="url(#beam)" filter="url(#softer)" />
          <path d="M230 60 L440 160 L1240 520 L1240 640 L980 640 Z" fill="url(#beam)" opacity="0.6" filter="url(#softer)" />
        </g>

        <motion.g style={fore}>
          <Plant />
        </motion.g>

        <rect x="-20" y="-10" width={SCENE_W + 40} height={SCENE_H + 20} fill="url(#vignette)" />
        {/* warm grade */}
        <rect x="-20" y="-10" width={SCENE_W + 40} height={SCENE_H + 20} fill="#ffb760" opacity="0.06" />
      </svg>

      {/* overlays (menus) are positioned in scene coordinates */}
      <motion.div className="absolute inset-0" style={back}>
        {children}
      </motion.div>
    </div>
  );
}

/** place a child over a rect given in scene units */
export function SceneSlot({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: React.ReactNode }) {
  // the svg viewBox is padded by 20 × 10 units on each side
  const vx = (x + 20) / (SCENE_W + 40);
  const vy = (y + 10) / (SCENE_H + 20);
  return (
    <div
      className="absolute"
      style={{ left: `${vx * 100}%`, top: `${vy * 100}%`, width: `${(w / (SCENE_W + 40)) * 100}%`, height: `${(h / (SCENE_H + 20)) * 100}%` }}
    >
      {children}
    </div>
  );
}
