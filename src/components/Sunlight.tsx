/**
 * Afternoon light over the whole page: a window's worth of sun thrown across
 * the wall, a monstera's shadow in the corner, a bit of dust in the beam.
 * Purely decorative, sits above content with no pointer events.
 */

const LEAF = "M0 0 C-58 -18 -112 -86 -96 -168 C-82 -236 -26 -266 0 -252 C26 -266 82 -236 96 -168 C112 -86 58 -18 0 0 Z";

// slits cut in from the leaf edge toward the midrib
const SLITS: Array<[number, number, number, number]> = [
  [-92, -150, -30, -128], [-98, -96, -26, -86], [-74, -48, -18, -44], [-76, -206, -24, -170],
  [92, -150, 30, -128], [98, -96, 26, -86], [74, -48, 18, -44], [76, -206, 24, -170],
];
const HOLES: Array<[number, number, number]> = [
  [-46, -112, 7], [46, -112, 7], [-40, -190, 6], [40, -190, 6],
];

function Leaf({ id, transform }: { id: string; transform: string }) {
  return (
    <g transform={transform}>
      <mask id={id}>
        <path d={LEAF} fill="white" />
        {SLITS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="black" strokeWidth="9" strokeLinecap="round" />
        ))}
        {HOLES.map(([cx, cy, r], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={r} ry={r * 1.8} fill="black" />
        ))}
      </mask>
      <path d={LEAF} mask={`url(#${id})`} />
      <path d="M0 0 C 6 40, 14 80, 30 160" fill="none" strokeWidth="7" />
    </g>
  );
}

function WindowLight() {
  // a tall arched window, four panes across, five down, with a mullion grid
  const cols = 4;
  const rows = 5;
  const w = 560;
  const paneW = (w - 40 - (cols - 1) * 14) / cols;
  const paneH = 112;
  const top = 250;
  const panes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      panes.push(<rect key={`${r}-${c}`} x={20 + c * (paneW + 14)} y={top + r * (paneH + 14)} width={paneW} height={paneH} rx="2" />);
    }
  }
  return (
    <svg viewBox="0 0 560 900" preserveAspectRatio="xMidYMin meet" className="h-full w-full" aria-hidden>
      <g fill="#ffd79a">
        {/* the arch */}
        <path d="M20 236 A260 220 0 0 1 540 236 Z" />
        {panes}
      </g>
      {/* arch glazing bars */}
      <g stroke="#e9cfa6" strokeWidth="12" opacity="0.9">
        <line x1="280" y1="20" x2="280" y2="236" />
        <line x1="280" y1="236" x2="90" y2="80" />
        <line x1="280" y1="236" x2="470" y2="80" />
      </g>
    </svg>
  );
}

export function Sunlight() {
  return (
    <div className="no-print pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden>
      {/* warm haze from the window side */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 0% 0%, rgba(255,214,150,0.16), transparent 70%), linear-gradient(118deg, rgba(255,226,170,0.10) 0%, transparent 38%, transparent 62%, rgba(255,226,170,0.07) 76%, transparent 86%)",
        }}
      />

      {/* the window, thrown long across the wall */}
      <div
        className="sun-drift absolute"
        style={{
          right: "-6vw",
          top: "-12vh",
          width: "min(62vw, 900px)",
          height: "140vh",
          opacity: 0.22,
          filter: "blur(10px)",
          mixBlendMode: "soft-light",
        }}
      >
        <WindowLight />
      </div>
      <div
        className="sun-drift absolute"
        style={{
          right: "-6vw",
          top: "-12vh",
          width: "min(62vw, 900px)",
          height: "140vh",
          opacity: 0.07,
          filter: "blur(16px)",
        }}
      >
        <WindowLight />
      </div>

      {/* dust in the beam */}
      <div className="dust absolute right-[18vw] top-[30vh] h-[60vh] w-[30vw] opacity-60">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#fff1d6]"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 61) % 100}%`,
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              filter: "blur(0.6px)",
              opacity: 0.35 + (i % 4) * 0.12,
            }}
          />
        ))}
      </div>

      {/* monstera shadow, bottom right */}
      <svg
        className="leaf-sway absolute -bottom-24 -right-16 h-[78vh] w-auto"
        viewBox="-300 -520 520 620"
        style={{ filter: "blur(7px)", opacity: 0.13 }}
      >
        <g fill="#4a2a12" stroke="#4a2a12">
          <Leaf id="leaf-a" transform="translate(-40 40) rotate(-38) scale(1.15)" />
          <Leaf id="leaf-b" transform="translate(40 60) rotate(-8) scale(1.3)" />
          <Leaf id="leaf-c" transform="translate(-120 100) rotate(-70) scale(0.95)" />
        </g>
      </svg>

      {/* a softer one, top left, further from the wall */}
      <svg
        className="leaf-sway absolute -left-20 -top-16 h-[46vh] w-auto"
        viewBox="-260 -300 420 420"
        style={{ filter: "blur(14px)", opacity: 0.08, animationDelay: "-4s" }}
      >
        <g fill="#4a2a12" stroke="#4a2a12">
          <Leaf id="leaf-d" transform="rotate(150) scale(0.9)" />
          <Leaf id="leaf-e" transform="translate(-60 -40) rotate(120) scale(0.75)" />
        </g>
      </svg>
    </div>
  );
}
