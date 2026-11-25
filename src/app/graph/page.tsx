"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AXIS_NAMES, flavorMap } from "@/lib/flavor";
import { useLibrary } from "@/lib/store";
import { Plate } from "@/components/Plate";

const CARD_W = 168;
const CARD_H = 96;

const AXIS_INK: Record<string, string> = {
  nutty: "#9a6a3a",
  caramel: "#b7793a",
  bright: "#c9a227",
  berry: "#7a2440",
  spice: "#8c4a2a",
  floral: "#c07a8c",
  cocoa: "#3f2618",
  custard: "#d6b45a",
  plain: "#8a7e72",
};

export default function FlavorGraph() {
  const { library } = useLibrary();
  const { points, edges } = useMemo(() => flavorMap(library.repos), [library.repos]);
  const board = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 620 });
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({});
  const [hover, setHover] = useState<string>();
  const drag = useRef<{ slug: string; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // PCA puts near-identical bakes on top of each other; nudge them apart
  const home = useMemo(() => {
    const ps = points.map((p) => ({ x: p.x * (size.w - CARD_W), y: p.y * (size.h - CARD_H) }));
    for (let it = 0; it < 120; it++) {
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[j].x - ps[i].x;
          const dy = ps[j].y - ps[i].y;
          const ox = CARD_W + 14 - Math.abs(dx);
          const oy = CARD_H + 14 - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox / CARD_W < oy / CARD_H) {
              const push = (ox / 2) * (dx < 0 ? -1 : 1);
              ps[i].x -= push;
              ps[j].x += push;
            } else {
              const push = (oy / 2) * (dy < 0 ? -1 : 1);
              ps[i].y -= push;
              ps[j].y += push;
            }
          }
        }
      }
      for (const p of ps) {
        p.x = Math.min(Math.max(8, p.x), size.w - CARD_W - 8);
        p.y = Math.min(Math.max(8, p.y), size.h - CARD_H - 8);
      }
    }
    return ps.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }));
  }, [points, size]);

  const at = (slug: string, i: number) => pos[slug] ?? home[i];

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = board.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.round(Math.min(Math.max(0, e.clientX - rect.left - d.dx), size.w - CARD_W));
    const y = Math.round(Math.min(Math.max(0, e.clientY - rect.top - d.dy), size.h - CARD_H));
    setPos((p) => ({ ...p, [d.slug]: { x, y } }));
  };

  return (
    <div>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-script text-3xl leading-none text-oxblood">what tastes like what</p>
          <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">flavor map</h1>
          <p className="mt-2 max-w-xl text-ink/70">
            every recipe&apos;s main line, placed by what&apos;s in it and what the tasting notes say. close cards taste alike; the
            flour trails link each bake to its nearest neighbours. drag them around.
          </p>
        </div>
        <button onClick={() => setPos({})} className="btn-ghost">
          reset layout
        </button>
      </section>

      <div
        ref={board}
        className="walnut relative h-[640px] touch-none select-none overflow-hidden rounded-[3px] shadow-card"
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <filter id="dust">
              <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          {edges.map(([a, b, s]) => {
            const pa = at(points[a].slug, a);
            const pb = at(points[b].slug, b);
            const lit = hover === points[a].slug || hover === points[b].slug;
            return (
              <g key={`${a}-${b}`} filter="url(#dust)" opacity={lit ? 1 : Math.round((0.45 + (s - 0.55) * 1.2) * 100) / 100}>
                <line
                  x1={pa.x + CARD_W / 2}
                  y1={pa.y + CARD_H / 2}
                  x2={pb.x + CARD_W / 2}
                  y2={pb.y + CARD_H / 2}
                  stroke="#f6efe2"
                  strokeWidth={lit ? 3.5 : 2.5}
                  strokeDasharray="0.5 5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>

        {points.map((p, i) => {
          const { x, y } = at(p.slug, i);
          const repo = library.repos.find((r) => r.slug === p.slug)!;
          const max = Math.max(1, ...AXIS_NAMES.map((a) => p.axes[a]));
          return (
            <div
              key={p.slug}
              className="absolute cursor-grab active:cursor-grabbing"
              style={{ left: x, top: y, width: CARD_W, height: CARD_H, transform: `rotate(${((i * 37) % 7) - 3}deg)` }}
              onPointerDown={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                drag.current = { slug: p.slug, dx: e.clientX - rect.left, dy: e.clientY - rect.top };
              }}
              onPointerEnter={() => setHover(p.slug)}
              onPointerLeave={() => setHover(undefined)}
            >
              <div className="flex h-full gap-2 border border-[#e4d6bd] bg-[#fbf6ea] p-2 shadow-tag">
                <Plate plate={repo.plate} pastry={repo.pastry} size={46} className="shrink-0 self-center" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/r/${p.slug}`}
                    className="font-display text-[17px] leading-[1.05] text-ink hover:text-oxblood"
                    onPointerDown={(e) => e.stopPropagation()}
                    draggable={false}
                  >
                    {p.title}
                  </Link>
                  <span className="label mt-auto text-[9px]" style={{ color: AXIS_INK[p.dominant] }}>
                    {p.dominant}
                  </span>
                  <div className="mt-1 flex h-3 items-end gap-[2px]" title="nutty · caramel · bright · berry · spice · floral · cocoa · custard">
                    {AXIS_NAMES.map((a) => (
                      <span key={a} className="w-full" style={{ height: `${(p.axes[a] / max) * 100}%`, minHeight: 1, background: AXIS_INK[a] }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {AXIS_NAMES.map((a) => (
          <span key={a} className="label flex items-center gap-1.5 text-ink/60">
            <span className="inline-block h-2.5 w-2.5" style={{ background: AXIS_INK[a] }} />
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}
