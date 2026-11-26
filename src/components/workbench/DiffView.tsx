"use client";

import type { Recipe, Repo } from "@/lib/ast";
import { diffRecipes, isEmpty, type IngredientDelta, type StepDelta } from "@/lib/diff";
import { minutes, signed } from "@/lib/format";
import { short } from "@/lib/hash";
import { history, workingTree } from "@/lib/repo";
import { Flag } from "@/components/Tag";

export type Ref = string; // "working" | "branch:<name>" | <commit hash>

export function resolveRef(repo: Repo, ref: Ref): Recipe | undefined {
  if (ref === "working") return workingTree(repo);
  if (ref.startsWith("branch:")) {
    const h = repo.branches[ref.slice(7)];
    return h ? repo.commits[h]?.recipe : undefined;
  }
  return repo.commits[ref]?.recipe;
}

function RefPicker({ repo, value, onChange, label }: { repo: Repo; value: Ref; onChange: (r: Ref) => void; label: string }) {
  const commits = Object.values(repo.commits).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="label text-[9.5px] text-ink/45">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field font-cond text-[12px]">
        <option value="working">working tree ({repo.head})</option>
        <optgroup label="branches">
          {Object.keys(repo.branches).map((b) => (
            <option key={b} value={`branch:${b}`}>
              {b}
            </option>
          ))}
        </optgroup>
        <optgroup label="bakes">
          {commits.map((c) => (
            <option key={c.hash} value={c.hash}>
              {short(c.hash)} · {c.message.slice(0, 40)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}

const RATIO_LABEL: Record<string, [string, string]> = {
  flour_g: ["flour", " g"],
  hydration_pct: ["hydration", "%"],
  fat_pct: ["fat", "%"],
  sugar_pct: ["sugar", "%"],
  salt_pct: ["salt", "%"],
  egg_pct: ["egg", "%"],
};

function IngredientLine({ d }: { d: IngredientDelta }) {
  const tone =
    d.change === "added" ? "text-forest" : d.change === "removed" ? "text-oxblood" : d.change === "changed" ? "text-ink" : "text-ink/40";
  return (
    <tr className={`border-b border-dashed border-ink/10 last:border-0 ${tone}`}>
      <td className="py-1 pr-2">
        <span className={d.change === "added" ? "ink-add" : d.change === "removed" ? "ink-del" : ""}>{d.name}</span>
        {d.renamed && <span className="ml-2 text-[13px] italic text-ink/50">was {d.renamed}</span>}
      </td>
      <td className="whitespace-nowrap py-1 text-right font-cond text-[12.5px] tabular-nums text-ink/45">{d.before ? `${d.before.grams} g` : ""}</td>
      <td className="w-6 text-center text-ink/30">→</td>
      <td className="whitespace-nowrap py-1 text-right font-cond text-[12.5px] tabular-nums">{d.after ? `${d.after.grams} g` : ""}</td>
      <td className="whitespace-nowrap py-1 pl-3 text-right font-cond text-[12.5px] tabular-nums">
        {d.dGrams !== 0 && (
          <span className={d.dGrams > 0 ? "ink-add text-forest" : "ink-del text-oxblood"}>{signed(d.dGrams, " g")}</span>
        )}
      </td>
      <td className="whitespace-nowrap hidden py-1 pl-3 text-right font-cond text-[11.5px] tabular-nums text-ink/45 sm:table-cell">
        {d.dPct !== 0 && signed(d.dPct, "%")}
      </td>
    </tr>
  );
}

function StepLine({ d }: { d: StepDelta }) {
  const s = (d.after ?? d.before)!;
  const cls = d.change === "added" ? "ink-add" : d.change === "removed" ? "ink-del" : "";
  return (
    <li className={`border-b border-dashed border-ink/10 py-1.5 last:border-0 ${d.change === "same" ? "text-ink/40" : ""}`}>
      <span className="label mr-2 text-oxblood">{s.action}</span>
      {d.dTemp !== undefined && <span className="label mr-2 text-ink">{signed(d.dTemp, "°C")}</span>}
      {d.dDuration !== undefined && (
        <span className="label mr-2 text-ink">
          {d.dDuration > 0 ? "+" : "−"}
          {minutes(Math.abs(d.dDuration))}
        </span>
      )}
      {d.change === "changed" && d.textChanged && d.before && d.after ? (
        <span className="block text-[14.5px] leading-snug">
          <span className="ink-del text-ink/55">{d.before.text}</span> <span className="ink-add">{d.after.text}</span>
        </span>
      ) : (
        <span className={`block text-[14.5px] leading-snug ${cls}`}>{s.text}</span>
      )}
    </li>
  );
}

export function DiffView({
  repo,
  from,
  to,
  setFrom,
  setTo,
  showSame,
  setShowSame,
}: {
  repo: Repo;
  from: Ref;
  to: Ref;
  setFrom: (r: Ref) => void;
  setTo: (r: Ref) => void;
  showSame: boolean;
  setShowSame: (b: boolean) => void;
}) {
  const a = resolveRef(repo, from);
  const b = resolveRef(repo, to);
  const diff = a && b ? diffRecipes(a, b) : undefined;

  // how far apart are they, in bakes?
  const hashOf = (r: Ref) => (r.startsWith("branch:") ? repo.branches[r.slice(7)] : r === "working" ? repo.branches[repo.head] : r);
  const ha = hashOf(from);
  const hb = hashOf(to);
  const ahead = ha && hb ? history(repo, hb).findIndex((c) => c.hash === ha) : -1;

  return (
    <div className="space-y-5">
      <div className="slip flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <RefPicker repo={repo} value={from} onChange={setFrom} label="from" />
        <button
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="label self-center px-2 py-2 text-ink/50 hover:text-oxblood sm:self-end"
          aria-label="swap"
        >
          ⇄
        </button>
        <RefPicker repo={repo} value={to} onChange={setTo} label="to" />
      </div>

      {!diff ? (
        <p className="text-ink/60">pick two points to compare.</p>
      ) : isEmpty(diff) ? (
        <div className="slip p-8 text-center">
          <p className="font-serif text-3xl">identical</p>
          <p className="text-ink/60">same recipe, gram for gram.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {diff.ratios
              .filter((r) => r.delta !== 0)
              .map((r) => (
                <Flag key={r.key} tone={r.delta > 0 ? "forest" : "ox"} tilt={r.delta > 0 ? -1.2 : 1}>
                  {RATIO_LABEL[r.key][0]} {r.before}
                  {RATIO_LABEL[r.key][1]} → {r.after}
                  {RATIO_LABEL[r.key][1]}
                </Flag>
              ))}
            {ahead > 0 && <span className="label px-2 py-1 text-ink/45">{ahead} bakes apart</span>}
          </div>

          <div className="slip px-5 pb-5 pt-4">
            <p className="label mb-3 text-[10px] text-muted">in short</p>
            <div className="flex flex-wrap gap-x-3 gap-y-3">
              {diff.summary.map((s, i) => (
                <Flag key={i} tilt={[-1.4, 0.8, -0.4, 1.6, -1][i % 5]} className={s.startsWith("+") ? "text-forest" : s.startsWith("−") ? "text-oxblood" : ""}>
                  {s}
                </Flag>
              ))}
            </div>
          </div>

          <label className="label flex items-center gap-2 text-ink/50">
            <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} className="accent-oxblood" />
            show unchanged lines
          </label>

          {diff.components
            .filter((c) => showSame || c.change !== "same")
            .map((c, i) => {
              const ings = c.ingredients.filter((d) => showSame || d.change !== "same");
              const steps = c.steps.filter((d) => showSame || d.change !== "same");
              return (
                <section key={i} className="slip px-6 py-6 sm:px-8 sm:py-7">
                  <header className="mb-2 flex items-baseline justify-between border-b border-oxblood/40 pb-1.5">
                    <h3
                      className={`label text-[12px] ${c.change === "added" ? "ink-add text-forest" : c.change === "removed" ? "ink-del text-oxblood" : "text-oxblood"}`}
                    >
                      {c.name}
                    </h3>
                    {c.renamed && <span className="text-[13px] italic text-ink/50">was {c.renamed}</span>}
                  </header>
                  <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
                    <div>
                      <p className="label mb-1 text-[9.5px] text-ink/40">baker&apos;s math</p>
                      {ings.length ? (
                        <table className="w-full text-[15px]">
                          <tbody>
                            {ings.map((d, j) => (
                              <IngredientLine key={j} d={d} />
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-[14px] italic text-ink/40">no changes</p>
                      )}
                    </div>
                    <div>
                      <p className="label mb-1 text-[9.5px] text-ink/40">method</p>
                      {steps.length ? (
                        <ol>
                          {steps.map((d, j) => (
                            <StepLine key={j} d={d} />
                          ))}
                        </ol>
                      ) : (
                        <p className="text-[14px] italic text-ink/40">no changes</p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
        </>
      )}
    </div>
  );
}
