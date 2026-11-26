"use client";

import { useMemo, useState } from "react";
import type { Recipe, Repo, Stamp as StampT } from "@/lib/ast";
import { Stamp as Stamps } from "@/lib/ast";
import { Stamp } from "@/components/Tag";
import { short } from "@/lib/hash";
import { guardrails, ratios, scaleToFlour, setHydration } from "@/lib/math";
import { DEFAULT_BRANCH, headCommit, isAncestor } from "@/lib/repo";

function Box({ title, children, note }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="slip p-4">
      <h3 className="mb-3 flex items-baseline justify-between border-b border-dashed border-ink/15 pb-1.5">
        <span className="label text-oxblood">{title}</span>
        {note && <span className="font-serif text-[16px] italic leading-none text-muted">{note}</span>}
      </h3>
      {children}
    </section>
  );
}

/**
 * Baker's math, set in white on a block of oxblood subway tile — the
 * counter front of the shop, with the numbers where the lettering would be.
 */
export function ScaleBox({ recipe, edit, readOnly }: { recipe: Recipe; edit: (fn: (r: Recipe) => Recipe) => void; readOnly: boolean }) {
  const r = ratios(recipe);
  const rails = guardrails(recipe);
  const rows: Array<[string, number]> = [
    ["hydration", r.hydration_pct],
    ["fat", r.fat_pct],
    ["sugar", r.sugar_pct],
    ["salt", r.salt_pct],
    ["egg", r.egg_pct],
    ["yeast", r.leavening_pct],
  ];
  return (
    <section className="border border-ink bg-oxblood text-white">
      <div className="px-5 py-3">
        <p className="font-cond text-[13px] font-bold uppercase tracking-[0.3em]">baker&apos;s math</p>
        <p className="font-cond text-[12px] uppercase tracking-[0.14em] text-white/70">per {r.flour_g} g flour</p>
      </div>
      {/* one tall glazed tile per figure, off-white grout between */}
      <ul className="grid grid-cols-3 gap-[2px] bg-[#efe7da] p-[2px]">
        {rows.map(([k, v]) => (
          <li key={k} className="relative flex aspect-[5/8] flex-col justify-between bg-oxblood px-2.5 py-3">
            <span className="absolute inset-y-0 left-[6px] w-[3px] bg-oxblood-light" aria-hidden />
            <span className="relative font-cond text-[34px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
              {v}
              <span className="text-[17px]">%</span>
            </span>
            <span className="relative font-cond text-[12px] font-semibold uppercase tracking-[0.18em]">{k}</span>
          </li>
        ))}
      </ul>

      {!readOnly && r.flour_g > 0 && (
        <div className="space-y-2 border-t-2 border-[#efe7da] px-5 py-4">
          <label className="block">
            <span className="flex justify-between font-cond text-[12px] font-semibold uppercase tracking-[0.16em]">
              <span>flour</span>
              <span>{r.flour_g} g</span>
            </span>
            <input
              type="range"
              min={50}
              max={Math.max(2000, r.flour_g)}
              step={10}
              value={r.flour_g}
              onChange={(e) => edit((x) => scaleToFlour(x, Number(e.target.value)))}
              className="flat text-white"
            />
          </label>
          <label className="block">
            <span className="flex justify-between font-cond text-[12px] font-semibold uppercase tracking-[0.16em]">
              <span>hydration</span>
              <span>{r.hydration_pct}%</span>
            </span>
            <input
              type="range"
              min={40}
              max={Math.max(100, Math.ceil(r.hydration_pct))}
              step={0.5}
              value={r.hydration_pct}
              onChange={(e) => edit((x) => setHydration(x, Number(e.target.value)))}
              className="flat text-white"
            />
          </label>
          <p className="font-serif text-[15px] italic leading-snug text-white/75">
            flour scales everything. hydration only moves water and milk; eggs and butter stay put.
          </p>
        </div>
      )}

      {rails.length > 0 && (
        <ul className="border-t-2 border-[#efe7da] bg-card text-ink">
          {rails.map((g) => (
            <li key={g.id} className="flex gap-2 border-b border-ink/15 px-5 py-2.5 text-[15px] leading-snug last:border-0">
              <span className={`label mt-[3px] shrink-0 text-[10px] ${g.severity === "warn" ? "text-oxblood" : "text-muted"}`}>
                {g.severity === "warn" ? "careful" : "note"}
              </span>
              <span>{g.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CommitBox({
  repo,
  dirty,
  onCommit,
  onDiscard,
}: {
  repo: Repo;
  dirty: boolean;
  onCommit: (msg: string, tasting?: { crumb_score: number; notes: string }) => void;
  onDiscard: () => void;
}) {
  const [msg, setMsg] = useState("");
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState("");
  const logOnly = !dirty;

  return (
    <Box title={logOnly ? "log a bake" : "commit"} note={logOnly ? "same recipe, new bake" : `on ${repo.head}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCommit(msg, score || notes ? { crumb_score: score, notes } : undefined);
          setMsg("");
          setNotes("");
          setScore(0);
        }}
        className="space-y-2"
      >
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={logOnly ? "rebake, nothing changed" : "what changed?"}
          className="field"
        />
        <div className="flex items-center gap-1" role="radiogroup" aria-label="crumb score">
          <span className="label mr-2 text-ink/50">crumb</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(score === n ? 0 : n)}
              className={`h-6 w-6 rounded-full border text-[11px] ${n <= score ? "border-oxblood bg-oxblood text-card" : "border-ink/20 text-ink/30"}`}
              aria-label={`${n} of 5`}
            >
              {n}
            </button>
          ))}
          {score > 0 && (
            <button type="button" onClick={() => setScore(Math.min(5, score + 0.5))} className="label ml-1 text-ink/40" title="half point">
              +½
            </button>
          )}
          {score > 0 && <span className="label ml-auto text-oxblood">{score}</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="tasting notes — crumb, colour, what to change next time"
          rows={3}
          className="field resize-none text-[14px]"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-ox" disabled={logOnly && !score && !notes}>
            {logOnly ? "log bake" : "commit"}
          </button>
          {dirty && (
            <button type="button" onClick={onDiscard} className="btn-line">
              discard changes
            </button>
          )}
        </div>
      </form>
    </Box>
  );
}

export function BranchBox({
  repo,
  dirty,
  onBranch,
  onCheckout,
  onMerge,
  onDelete,
}: {
  repo: Repo;
  dirty: boolean;
  onBranch: (name: string) => void;
  onCheckout: (b: string) => void;
  onMerge: (b: string) => void;
  onDelete: (b: string) => void;
}) {
  const [name, setName] = useState("");
  const others = Object.keys(repo.branches).filter((b) => b !== repo.head);
  const mergeable = others.filter((b) => !isAncestor(repo, repo.branches[b], repo.branches[repo.head]));

  return (
    <Box title="branches" note="experiments">
      <ul className="mb-3 space-y-1">
        {Object.entries(repo.branches).map(([b, h]) => (
          <li key={b} className="flex items-center gap-2">
            <button
              onClick={() => b !== repo.head && onCheckout(b)}
              className={`label flex-1 truncate text-left ${b === repo.head ? "text-oxblood" : "text-ink/70 hover:text-oxblood"}`}
              title={dirty && b !== repo.head ? "switching drops uncommitted changes" : undefined}
            >
              {b === repo.head ? "● " : "○ "}
              {b}
            </button>
            <span className="label text-ink/35">{short(h)}</span>
            {b !== DEFAULT_BRANCH && b !== repo.head && (
              <button onClick={() => onDelete(b)} className="label text-ink/25 hover:text-oxblood" aria-label={`delete ${b}`}>
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onBranch(name);
          setName("");
        }}
        className="flex gap-2"
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="eggless-test" className="field font-cond text-[13px]" />
        <button className="btn-forest shrink-0" disabled={!name.trim()}>
          fork
        </button>
      </form>
      {mergeable.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label text-ink/50">merge into {repo.head}:</span>
          {mergeable.map((b) => (
            <button key={b} onClick={() => onMerge(b)} className="label border border-forest/40 px-1.5 py-0.5 text-forest hover:bg-forest hover:text-card">
              {b}
            </button>
          ))}
        </div>
      )}
    </Box>
  );
}

export function GraftBox({ repo, library, onGraft }: { repo: Repo; library: Repo[]; onGraft: (source: string, commit: string, component: string) => void }) {
  const sources = library;
  const [src, setSrc] = useState(sources.find((r) => r.slug !== repo.slug)?.slug ?? repo.slug);
  const source = sources.find((r) => r.slug === src);
  const tip = source ? headCommit(source) : undefined;
  const [comp, setComp] = useState("");
  const components = useMemo(() => tip?.recipe.components ?? [], [tip]);
  const chosen = components.find((c) => c.id === comp) ?? components[0];

  return (
    <Box title="cherry-pick" note="borrow a component">
      <div className="space-y-2">
        <select value={src} onChange={(e) => { setSrc(e.target.value); setComp(""); }} className="field text-[14px]">
          {sources.map((r) => (
            <option key={r.slug} value={r.slug}>
              {headCommit(r).recipe.title}
            </option>
          ))}
        </select>
        <select value={chosen?.id ?? ""} onChange={(e) => setComp(e.target.value)} className="field text-[14px]">
          {components.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.ingredients.length})
            </option>
          ))}
        </select>
        <button className="btn-forest" disabled={!chosen || !tip} onClick={() => chosen && tip && source && onGraft(source.slug, tip.hash, chosen.id)}>
          graft into working tree
        </button>
      </div>
    </Box>
  );
}

export function StampBox({
  repo,
  onStamp,
  onDelete,
}: {
  repo: Repo;
  onStamp: (stamp: StampT | undefined) => void;
  onDelete: () => void;
}) {
  return (
    <Box title="stamp it" note="when it's ready">
      <div className="grid grid-cols-3 gap-2">
        {Stamps.options.map((k) => {
          const on = repo.stamp === k;
          return (
            <button
              key={k}
              onClick={() => onStamp(on ? undefined : k)}
              className={`rounded-full transition-all ${on ? "scale-105 opacity-100" : "opacity-35 grayscale hover:opacity-70"}`}
              aria-pressed={on}
              aria-label={k}
            >
              <Stamp kind={k} className="h-auto w-full" />
            </button>
          );
        })}
      </div>
      <button
        onClick={() => {
          if (window.confirm(`throw out ${headCommit(repo).recipe.title} and all its history?`)) onDelete();
        }}
        className="label mt-4 text-ink/35 hover:text-oxblood"
      >
        delete recipe
      </button>
    </Box>
  );
}
