"use client";

import { useMemo, useState } from "react";
import type { Linen as LinenT, PastryShape as PastryT, PlateStyle as PlateT, Recipe, Repo, Stamp as StampT } from "@/lib/ast";
import { Linen, PastryShape, PlateStyle, Stamp } from "@/lib/ast";
import { short } from "@/lib/hash";
import { guardrails, ratios, scaleToFlour, setHydration } from "@/lib/math";
import { DEFAULT_BRANCH, headCommit, isAncestor } from "@/lib/repo";

function Box({ title, children, script }: { title: string; script?: string; children: React.ReactNode }) {
  return (
    <section className="paper p-4 shadow-card">
      <h3 className="mb-3 flex items-baseline justify-between border-b border-ink/15 pb-1">
        <span className="label text-oxblood">{title}</span>
        {script && <span className="font-script text-lg leading-none text-ink/45">{script}</span>}
      </h3>
      {children}
    </section>
  );
}

export function ScaleBox({ recipe, edit, readOnly }: { recipe: Recipe; edit: (fn: (r: Recipe) => Recipe) => void; readOnly: boolean }) {
  const r = ratios(recipe);
  const rails = guardrails(recipe);
  return (
    <Box title="baker's math" script="à la balance">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["hydration", r.hydration_pct],
          ["fat", r.fat_pct],
          ["sugar", r.sugar_pct],
          ["salt", r.salt_pct],
          ["egg", r.egg_pct],
          ["yeast", r.leavening_pct],
        ].map(([k, v]) => (
          <div key={k as string} className="border border-ink/10 bg-cream/60 py-1.5">
            <div className="font-display text-2xl leading-none">{v}%</div>
            <div className="label text-[9px] text-ink/45">{k}</div>
          </div>
        ))}
      </div>

      {!readOnly && r.flour_g > 0 && (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="label flex justify-between text-ink/55">
              <span>flour</span>
              <span className="text-ink">{r.flour_g} g</span>
            </span>
            <input
              type="range"
              min={50}
              max={Math.max(2000, r.flour_g)}
              step={10}
              value={r.flour_g}
              onChange={(e) => edit((x) => scaleToFlour(x, Number(e.target.value)))}
              className="w-full accent-oxblood"
            />
          </label>
          <label className="block">
            <span className="label flex justify-between text-ink/55">
              <span>hydration</span>
              <span className="text-ink">{r.hydration_pct}%</span>
            </span>
            <input
              type="range"
              min={40}
              max={Math.max(100, Math.ceil(r.hydration_pct))}
              step={0.5}
              value={r.hydration_pct}
              onChange={(e) => edit((x) => setHydration(x, Number(e.target.value)))}
              className="w-full accent-awning"
            />
          </label>
          <p className="text-[13px] italic leading-snug text-ink/50">
            flour scales everything. hydration only moves water and milk — eggs and butter stay put.
          </p>
        </div>
      )}

      {rails.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rails.map((g) => (
            <li
              key={g.id}
              className={`border-l-2 pl-2 text-[14px] leading-snug ${g.severity === "warn" ? "border-oxblood text-oxblood" : "border-crust text-ink/75"}`}
            >
              {g.text}
            </li>
          ))}
        </ul>
      )}
    </Box>
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
    <Box title={logOnly ? "log a bake" : "commit"} script={logOnly ? "same recipe, new bake" : `on ${repo.head}`}>
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
              className={`h-6 w-6 rounded-full border text-[11px] ${n <= score ? "border-crust bg-crust text-parchment" : "border-ink/20 text-ink/30"}`}
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
          {score > 0 && <span className="label ml-auto text-crust">{score}</span>}
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
            <button type="button" onClick={onDiscard} className="btn-ghost">
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
    <Box title="branches" script="experiments">
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
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="eggless-test" className="field font-mono text-[13px]" />
        <button className="btn-green shrink-0" disabled={!name.trim()}>
          fork
        </button>
      </form>
      {mergeable.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label text-ink/50">merge into {repo.head}:</span>
          {mergeable.map((b) => (
            <button key={b} onClick={() => onMerge(b)} className="label border border-awning/40 px-1.5 py-0.5 text-awning hover:bg-awning hover:text-parchment">
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
    <Box title="cherry-pick" script="borrow a component">
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
        <button className="btn-green" disabled={!chosen || !tip} onClick={() => chosen && tip && source && onGraft(source.slug, tip.hash, chosen.id)}>
          graft into working tree
        </button>
      </div>
    </Box>
  );
}

export function LookBox({
  repo,
  onChange,
  onDelete,
}: {
  repo: Repo;
  onChange: (patch: Partial<Pick<Repo, "linen" | "plate" | "pastry" | "stamp">>) => void;
  onDelete: () => void;
}) {
  const pick = <T extends string>(label: string, value: T | undefined, options: readonly T[], set: (v: T) => void, none?: string) => (
    <label className="flex items-center justify-between gap-2">
      <span className="label text-ink/50">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => set(e.target.value as T)}
        className="label border-b border-ink/20 bg-transparent py-0.5 text-ink outline-none"
      >
        {none && <option value="">{none}</option>}
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
  return (
    <Box title="the plate" script="presentation">
      <div className="space-y-2">
        {pick<LinenT>("linen", repo.linen, Linen.options, (linen) => onChange({ linen }))}
        {pick<PlateT>("plate", repo.plate, PlateStyle.options, (plate) => onChange({ plate }))}
        {pick<PastryT>("pastry", repo.pastry, PastryShape.options, (pastry) => onChange({ pastry }))}
        {pick<StampT>("stamp", repo.stamp, Stamp.options, (stamp) => onChange({ stamp: (stamp || undefined) as StampT | undefined }), "none")}
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
