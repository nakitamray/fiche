"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Repo } from "@/lib/ast";
import { AXIS_NAMES, flavorAxes } from "@/lib/flavor";
import { shortDate } from "@/lib/format";
import { ratios } from "@/lib/math";
import { lastTasting, workingTree } from "@/lib/repo";
import { Stamp } from "./Tag";

export interface MenuItem {
  href: string;
  label: string;
  value: string;
}

/**
 * Menu written on a brass-framed mirror. `fluid` sizes the type off the
 * container (for when it hangs inside the café scene).
 */
export function MenuMirror({ title, items, fluid = false, empty }: { title: string; items: MenuItem[]; fluid?: boolean; empty?: string }) {
  const t = fluid
    ? { title: "text-[3.4cqw]", item: "text-[0.92cqw]", pad: "px-[1.4cqw] py-[1.1cqw]", gap: "gap-[0.42cqw]" }
    : { title: "text-[40px]", item: "text-[12.5px]", pad: "px-6 py-6", gap: "gap-2" };
  return (
    <div className={`mirror flex h-full flex-col ${t.pad}`}>
      <p className={`text-center font-script leading-none text-[#e0543f] [text-shadow:0_0_12px_rgba(255,110,80,0.35)] ${t.title}`}>{title}</p>
      <ul className={`mt-[6%] flex flex-col ${t.gap}`}>
        {items.map((i) => (
          <li key={`${i.href}:${i.label}`}>
            <Link href={i.href} className={`group flex items-baseline gap-1 font-mono uppercase tracking-[0.06em] ${t.item}`}>
              <span className="min-w-0 truncate text-[#f6e3b9] transition-colors group-hover:text-white">{i.label}</span>
              <span className="min-w-[1.5em] flex-1 translate-y-[-0.2em] border-b border-dotted border-[#f6e3b9]/40" />
              <span className="shrink-0 text-[#e9c46f]">{i.value}</span>
            </Link>
          </li>
        ))}
        {!items.length && empty && <li className={`text-center font-mono uppercase text-[#f6e3b9]/50 ${t.item}`}>{empty}</li>}
      </ul>
    </div>
  );
}

function flavorLine(repo: Repo): string {
  const tree = workingTree(repo);
  const axes = flavorAxes(tree, lastTasting(repo)?.tasting.notes);
  const top = AXIS_NAMES.filter((a) => axes[a] > 0)
    .sort((a, b) => axes[b] - axes[a])
    .slice(0, 2);
  return top.length ? top.join(" & ") : "plain & buttery";
}

type BoardStyle = "mirror" | "enamel" | "felt";
const STYLES: BoardStyle[] = ["mirror", "enamel", "felt"];

const BOARD: Record<BoardStyle, { shell: string; title: string; script: string; row: string; dots: string; value: string; quote: string; meta: string }> = {
  mirror: {
    shell: "mirror",
    title: "text-[#f6e3b9]",
    script: "text-[#e0543f] [text-shadow:0_0_12px_rgba(255,110,80,0.35)]",
    row: "text-[#f6e3b9]",
    dots: "border-[#f6e3b9]/35",
    value: "text-[#e9c46f]",
    quote: "text-[#f6e3b9]/70",
    meta: "text-[#f6e3b9]/45",
  },
  enamel: {
    shell: "enamel",
    title: "text-ink",
    script: "text-glaze",
    row: "text-ink/80",
    dots: "border-ink/25",
    value: "text-glaze",
    quote: "text-ink/65",
    meta: "text-ink/40",
  },
  felt: {
    shell: "felt",
    title: "text-[#f1ece0] [text-shadow:1px_1px_0_rgba(0,0,0,0.45)]",
    script: "text-[#e9c46f]",
    row: "text-[#f1ece0] [text-shadow:1px_1px_0_rgba(0,0,0,0.45)]",
    dots: "border-[#f1ece0]/25",
    value: "text-[#f1ece0] [text-shadow:1px_1px_0_rgba(0,0,0,0.45)]",
    quote: "text-[#f1ece0]/65",
    meta: "text-[#f1ece0]/40",
  },
};

/** ratios only mean something against real flour; frangipane on day-old croissants reads 600% */
const pct = (v: number, flour: number) => (flour >= 100 && v > 0 && v <= 150 ? `${v}%` : "—");

/**
 * A recipe as a café menu board hanging on the wall: picture light above,
 * window light falling across it, swings a little when you touch it.
 */
export function MenuBoard({ repo, index }: { repo: Repo; index: number }) {
  const recipe = workingTree(repo);
  const r = ratios(recipe);
  const last = lastTasting(repo);
  const score = last?.tasting.crumb_score ?? 0;
  const style = STYLES[index % STYLES.length];
  const t = BOARD[style];
  const rows: Array<[string, string]> = [
    ["hydration", pct(r.hydration_pct, r.flour_g)],
    ["fat", pct(r.fat_pct, r.flour_g)],
    ["sugar", pct(r.sugar_pct, r.flour_g)],
    ["bakes", String(Object.keys(repo.commits).length)],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.05, duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      className="relative pt-9"
    >
      {/* picture light + its throw */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center">
        <div className="h-3 w-1.5 bg-gradient-to-r from-brass-deep via-brass-light to-brass-deep" />
        <div className="h-[7px] w-28 rounded-full bg-gradient-to-b from-brass-light via-brass to-brass-deep shadow-[4px_6px_8px_rgba(60,32,10,0.35)]" />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-4 z-0 h-56 w-[120%] -translate-x-1/2"
        style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(255,232,180,0.55), transparent 70%)", filter: "blur(6px)" }}
      />

      <Link href={`/r/${repo.slug}`} className="group relative z-[1] block">
        <motion.div
          whileHover={{ rotate: index % 2 ? 1.2 : -1.2, y: -3 }}
          transition={{ type: "spring", stiffness: 160, damping: 12 }}
          style={{ transformOrigin: "50% -36px" }}
          className={`${t.shell} relative px-6 pb-6 pt-5 transition-shadow duration-300`}
        >
          <p className={`text-center font-script text-[26px] leading-none ${t.script}`}>{flavorLine(repo)}</p>
          <h3 className={`mt-1 text-center font-display text-[30px] leading-[0.95] ${t.title}`}>{recipe.title}</h3>

          <ul className="mt-4 space-y-1.5">
            {rows.map(([k, v]) => (
              <li key={k} className={`flex items-baseline gap-1 font-mono text-[12px] uppercase tracking-[0.1em] ${t.row}`}>
                <span>{k}</span>
                <span className={`flex-1 translate-y-[-0.2em] border-b border-dotted ${t.dots}`} />
                <span className={t.value}>{v}</span>
              </li>
            ))}
          </ul>

          {last && <p className={`mt-4 line-clamp-2 text-center text-[14px] italic leading-snug ${t.quote}`}>“{last.tasting.notes}”</p>}

          <div className={`mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] ${t.meta}`}>
            <span>{repo.head}</span>
            {score > 0 && (
              <span className="flex gap-[3px]" aria-label={`${score} of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`h-1.5 w-1.5 rounded-full ${n <= Math.round(score) ? "bg-honey" : "bg-current opacity-30"}`} />
                ))}
              </span>
            )}
            {last && <span>{shortDate(last.date)}</span>}
          </div>

          {/* window light falling across the board */}
          <div className="sun-panes pointer-events-none absolute inset-0 rounded-[inherit]" style={{ backgroundPosition: `${index * 37}px ${index * 19}px` }} />
        </motion.div>
        {repo.stamp && <Stamp kind={repo.stamp} className="absolute -right-3 -top-3 z-[2] h-[74px] w-[74px]" />}
      </Link>
    </motion.div>
  );
}

/**
 * The wall the boards hang on: plaster up top, striped tile wainscot with a
 * marble ledge, checkered floor, all under the afternoon window.
 */
export function MenuWall({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[6px] shadow-lift">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f1e3cb,#e8d3b2)]" />
      {/* wainscot */}
      <div className="absolute inset-x-0 bottom-[70px] h-[46%] stripe-tile" />
      <div className="absolute inset-x-0 bottom-[calc(70px+46%)] h-[14px] marble shadow-[0_6px_10px_-4px_rgba(60,32,10,0.45)]" />
      {/* floor */}
      <div className="absolute inset-x-0 bottom-0 h-[70px] overflow-hidden [perspective:400px]">
        <div className="checker-floor absolute inset-x-[-20%] bottom-[-40px] top-0 origin-top [transform:rotateX(52deg)]" />
        <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/30 to-transparent" />
      </div>
      {/* the window, thrown across all of it */}
      <div className="wall-sun pointer-events-none absolute inset-0" />
      <div className="relative px-5 pb-[110px] pt-8 sm:px-10">{children}</div>
    </div>
  );
}

/** felt letterboard, white letters pressed into the grooves */
export function Letterboard({ lines }: { lines: Array<[string, string]> }) {
  return (
    <div
      className="relative overflow-hidden rounded-[4px] px-6 py-6 shadow-lift sm:px-10"
      style={{
        background:
          "repeating-linear-gradient(180deg, #24382c 0 13px, #1b2b21 13px 14px), linear-gradient(180deg, #2a4133, #1f3127)",
        boxShadow: "inset 0 0 0 6px #6b4a2a, inset 0 0 0 8px #3b2716, 18px 28px 50px -20px rgba(40,24,10,0.6)",
      }}
    >
      <div className="grid gap-x-12 gap-y-2 sm:grid-cols-2">
        {lines.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 font-mono text-[15px] uppercase tracking-[0.18em] text-[#f1ece0] [text-shadow:1px_1px_0_rgba(0,0,0,0.45)]">
            <span>{k}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,230,180,0.12),transparent_40%)]" />
    </div>
  );
}
