"use client";

import Link from "next/link";
import type { Repo } from "@/lib/ast";
import { AXIS_NAMES, flavorAxes } from "@/lib/flavor";
import { shortDate } from "@/lib/format";
import { ratios } from "@/lib/math";
import { DEFAULT_BRANCH, lastTasting, workingTree } from "@/lib/repo";
import { Stamp, WireClip } from "./Tag";

/** ratios only mean something against real flour; frangipane on day-old croissants reads 600% */
export const pct = (v: number, flour: number) => (flour >= 100 && v > 0 && v <= 150 ? `${v}%` : "—");

function flavorLine(repo: Repo): string {
  const axes = flavorAxes(workingTree(repo), lastTasting(repo)?.tasting.notes);
  const top = AXIS_NAMES.filter((a) => axes[a] > 0)
    .sort((a, b) => axes[b] - axes[a])
    .slice(0, 2);
  return top.length ? top.join(" & ") : "plain & buttery";
}

const TILTS = [-1.6, 1.1, -0.6, 1.8, -1.2, 0.7, -2, 1.4, -0.4];

/**
 * One recipe as the price card stuck into a tray in the case: wire clip on
 * top, a pick running down to the ledge.
 */
function PriceCard({ repo, index }: { repo: Repo; index: number }) {
  const recipe = workingTree(repo);
  const r = ratios(recipe);
  const last = lastTasting(repo);
  const tilt = TILTS[index % TILTS.length];

  return (
    <div className="flex h-full flex-col items-center px-3 pt-6 sm:px-5">
      <Link
        href={`/r/${repo.slug}`}
        className="group relative block w-full max-w-[300px] transition-transform duration-200 hover:-translate-y-1"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <WireClip className="absolute left-1/2 top-[-15px] h-[22px] w-[14px] -translate-x-1/2" />
        <div className="slip px-5 pb-4 pt-4 group-hover:bg-white">
          <p className="label text-[10px] text-muted">
            n° {String(index + 1).padStart(2, "0")} · {repo.head === DEFAULT_BRANCH ? "main" : repo.head}
          </p>
          <h3 className="mt-1.5 font-cond text-[25px] font-bold uppercase leading-[0.95] tracking-[0.02em] text-ink">{recipe.title}</h3>
          <p className="mt-1 font-serif text-[17px] italic leading-tight text-oxblood">{flavorLine(repo)}</p>
          <div className="mt-3 flex items-end justify-between border-t border-ink pt-2">
            <span className="font-cond text-[13px] font-semibold uppercase tracking-[0.08em]">hyd {pct(r.hydration_pct, r.flour_g)}</span>
            <span className="label text-[10px] text-muted">{last ? shortDate(last.date) : "unbaked"}</span>
          </div>
        </div>
        {repo.stamp && <Stamp kind={repo.stamp} className="absolute -right-5 -top-6 h-[68px] w-[68px]" />}
      </Link>
      {/* the pick */}
      <div className="w-[2px] flex-1 bg-silver" style={{ minHeight: 26 }} />
    </div>
  );
}

/** the case: flags on picks, a ledge, and the tiled counter front below */
export function Vitrine({ repos }: { repos: Repo[] }) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo, i) => (
          <div key={repo.slug} className="flex flex-col">
            <PriceCard repo={repo} index={i} />
            <div className="ledge h-3" />
          </div>
        ))}
      </div>
      <div className="oxtile relative border-x border-b border-ink">
        <div className="flex h-40 items-center justify-center px-6 sm:h-48">
          <p className="bg-oxblood px-4 py-1 text-center font-cond text-[22px] font-semibold uppercase tracking-[0.4em] text-white sm:text-[30px]">
            fiche · boulangerie
          </p>
        </div>
      </div>
    </div>
  );
}

export interface ListRow {
  href: string;
  name: string;
  detail: string;
  value: string;
}

/** a printed price list, like the one taped by the till */
export function PriceList({ title, rows, empty }: { title: string; rows: ListRow[]; empty: string }) {
  return (
    <div className="slip px-6 py-6 sm:px-8">
      <h3 className="border-b-2 border-ink pb-2 font-cond text-[13px] font-bold uppercase tracking-[0.3em]">{title}</h3>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={`${r.href}:${r.name}`}>
            <Link href={r.href} className="group flex items-baseline gap-2 border-b border-dashed border-ink/25 py-2">
              <span className="font-serif text-[21px] italic leading-none group-hover:text-oxblood">{r.name}</span>
              <span className="label text-[10px] text-muted">{r.detail}</span>
              <span className="flex-1" />
              <span className="font-cond text-[15px] font-semibold tabular-nums">{r.value}</span>
            </Link>
          </li>
        ))}
        {!rows.length && <li className="py-2 font-serif italic text-muted">{empty}</li>}
      </ul>
    </div>
  );
}
