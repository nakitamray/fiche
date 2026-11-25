"use client";

import type { Component, Ingredient, IngredientKind, Recipe, Step } from "@/lib/ast";
import { IngredientKind as Kinds } from "@/lib/ast";
import { guessKind } from "@/lib/density";
import { minutes } from "@/lib/format";
import { uid } from "@/lib/hash";
import { bakersPct, totalFlour } from "@/lib/math";
import { cToF, round } from "@/lib/units";

type Edit = (fn: (r: Recipe) => Recipe) => void;

function patchComponent(r: Recipe, id: string, fn: (c: Component) => Component): Recipe {
  return { ...r, components: r.components.map((c) => (c.id === id ? fn(c) : c)) };
}

function NumberCell({
  value,
  onChange,
  readOnly,
  step = 1,
  className = "",
  placeholder,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  readOnly?: boolean;
  step?: number;
  className?: string;
  placeholder?: string;
}) {
  if (readOnly) return <span className={className}>{value ?? "—"}</span>;
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      className={`w-full bg-transparent text-right tabular-nums outline-none focus:bg-parchment ${className}`}
    />
  );
}

function IngredientRow({
  ing,
  recipe,
  flour,
  readOnly,
  onChange,
  onRemove,
}: {
  ing: Ingredient;
  recipe: Recipe;
  flour: number;
  readOnly: boolean;
  onChange: (i: Ingredient) => void;
  onRemove: () => void;
}) {
  const pct = bakersPct(ing, recipe);
  return (
    <tr className="group border-b border-dashed border-ink/10 last:border-0">
      <td className="py-1.5 pr-2">
        {readOnly ? (
          <span>{ing.name}</span>
        ) : (
          <input
            value={ing.name}
            onChange={(e) => onChange({ ...ing, name: e.target.value })}
            onBlur={(e) => ing.kind === "other" && onChange({ ...ing, name: e.target.value, kind: guessKind(e.target.value) })}
            className="w-full bg-transparent outline-none focus:bg-parchment"
          />
        )}
        {ing.replaces && <span className="block font-script text-lg leading-none text-oxblood/80">instead of {ing.replaces}</span>}
        {ing.source && <span className="label block text-[9.5px] text-crust">check: “{ing.source}”</span>}
      </td>
      <td className="w-20 py-1.5 pr-1 font-mono text-[13px]">
        <NumberCell value={ing.grams} readOnly={readOnly} onChange={(n) => onChange({ ...ing, grams: n ?? 0, source: undefined })} />
      </td>
      <td className="label w-6 py-1.5 text-ink/40">g</td>
      <td className="w-20 py-1.5 pr-1 font-mono text-[13px] text-oxblood">
        <NumberCell
          value={pct}
          step={0.1}
          readOnly={readOnly || !flour}
          onChange={(n) => onChange({ ...ing, grams: round(((n ?? 0) * flour) / 100, 1), source: undefined })}
        />
      </td>
      <td className="label w-6 py-1.5 text-oxblood/50">%</td>
      <td className="hidden w-28 py-1.5 pl-2 sm:table-cell">
        {readOnly ? (
          <span className="label text-ink/50">{ing.kind}</span>
        ) : (
          <select
            value={ing.kind}
            onChange={(e) => onChange({ ...ing, kind: e.target.value as IngredientKind })}
            className="label w-full bg-transparent text-ink/55 outline-none"
          >
            {Kinds.options.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        )}
      </td>
      {!readOnly && (
        <td className="w-6 py-1.5 text-right">
          <button onClick={onRemove} className="label text-ink/25 hover:text-oxblood" aria-label={`remove ${ing.name}`}>
            ×
          </button>
        </td>
      )}
    </tr>
  );
}

function StepRow({
  step,
  n,
  readOnly,
  onChange,
  onRemove,
}: {
  step: Step;
  n: number;
  readOnly: boolean;
  onChange: (s: Step) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-x-2 border-b border-dashed border-ink/10 py-2 last:border-0">
      <span className="font-display text-2xl leading-none text-oxblood/70">{n}</span>
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {readOnly ? (
            <span className="label text-oxblood">{step.action}</span>
          ) : (
            <input
              value={step.action}
              onChange={(e) => onChange({ ...step, action: e.target.value })}
              className="label w-28 bg-transparent text-oxblood outline-none focus:bg-parchment"
            />
          )}
          {readOnly ? (
            <>
              {step.duration_min !== undefined && <span className="label text-ink/50">{minutes(step.duration_min)}</span>}
              {step.temp_c !== undefined && (
                <span className="label text-ink/50">
                  {step.temp_c}°C <span className="text-ink/30">/ {cToF(step.temp_c)}°F</span>
                </span>
              )}
            </>
          ) : (
            <>
              <span className="label flex items-center gap-1 text-ink/50">
                <span className="w-12">
                  <NumberCell value={step.duration_min} placeholder="—" onChange={(v) => onChange({ ...step, duration_min: v })} />
                </span>
                min
              </span>
              <span className="label flex items-center gap-1 text-ink/50">
                <span className="w-12">
                  <NumberCell value={step.temp_c} placeholder="—" onChange={(v) => onChange({ ...step, temp_c: v })} />
                </span>
                °C{step.temp_c !== undefined && <span className="text-ink/30">/{cToF(step.temp_c)}°F</span>}
              </span>
              <button onClick={onRemove} className="label ml-auto text-ink/25 hover:text-oxblood" aria-label="remove step">
                ×
              </button>
            </>
          )}
        </div>
        {readOnly ? (
          <p className="mt-0.5 text-[15px] leading-snug">{step.text}</p>
        ) : (
          <textarea
            value={step.text}
            rows={Math.max(1, Math.ceil(step.text.length / 70))}
            onChange={(e) => onChange({ ...step, text: e.target.value })}
            className="mt-0.5 w-full resize-none bg-transparent text-[15px] leading-snug outline-none focus:bg-parchment"
          />
        )}
      </div>
    </li>
  );
}

export function RatioSheet({ recipe, edit, readOnly }: { recipe: Recipe; edit: Edit; readOnly: boolean }) {
  const flour = totalFlour(recipe);

  return (
    <div className="space-y-6">
      {recipe.components.map((c) => (
        <section key={c.id} className="paper p-4 shadow-card sm:p-5">
          <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-oxblood/40 pb-1.5">
            {readOnly ? (
              <h3 className="label text-[12px] text-oxblood">{c.name}</h3>
            ) : (
              <input
                value={c.name}
                onChange={(e) => edit((r) => patchComponent(r, c.id, (x) => ({ ...x, name: e.target.value })))}
                className="label min-w-0 flex-1 bg-transparent text-[12px] text-oxblood outline-none focus:bg-parchment"
              />
            )}
            <span className="flex items-center gap-3">
              {c.origin && <span className="font-script text-lg leading-none text-awning">grafted from {c.origin.repo}</span>}
              {!readOnly && (
                <button
                  onClick={() => edit((r) => ({ ...r, components: r.components.filter((x) => x.id !== c.id) }))}
                  className="label text-ink/30 hover:text-oxblood"
                >
                  remove
                </button>
              )}
            </span>
          </header>

          <table className="w-full text-[15px]">
            <thead>
              <tr className="label text-[9.5px] text-ink/40">
                <th className="py-1 text-left font-normal">ingredient</th>
                <th className="py-1 pr-1 text-right font-normal" colSpan={2}>
                  weight
                </th>
                <th className="py-1 pr-1 text-right font-normal" colSpan={2}>
                  baker&apos;s
                </th>
                <th className="hidden py-1 pl-2 text-left font-normal sm:table-cell">kind</th>
                {!readOnly && <th />}
              </tr>
            </thead>
            <tbody>
              {c.ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ing={ing}
                  recipe={recipe}
                  flour={flour}
                  readOnly={readOnly}
                  onChange={(next) =>
                    edit((r) =>
                      patchComponent(r, c.id, (x) => ({ ...x, ingredients: x.ingredients.map((i) => (i.id === ing.id ? next : i)) })),
                    )
                  }
                  onRemove={() =>
                    edit((r) => patchComponent(r, c.id, (x) => ({ ...x, ingredients: x.ingredients.filter((i) => i.id !== ing.id) })))
                  }
                />
              ))}
            </tbody>
          </table>
          {!readOnly && (
            <button
              onClick={() =>
                edit((r) =>
                  patchComponent(r, c.id, (x) => ({
                    ...x,
                    ingredients: [...x.ingredients, { id: uid("ing"), name: "", grams: 0, kind: "other" }],
                  })),
                )
              }
              className="label mt-1 text-ink/45 hover:text-oxblood"
            >
              + ingredient
            </button>
          )}

          {(c.steps.length > 0 || !readOnly) && (
            <>
              <h4 className="label mb-1 mt-4 text-[9.5px] text-ink/40">method</h4>
              <ol>
                {c.steps.map((s, i) => (
                  <StepRow
                    key={s.id}
                    step={s}
                    n={i + 1}
                    readOnly={readOnly}
                    onChange={(next) =>
                      edit((r) => patchComponent(r, c.id, (x) => ({ ...x, steps: x.steps.map((y) => (y.id === s.id ? next : y)) })))
                    }
                    onRemove={() => edit((r) => patchComponent(r, c.id, (x) => ({ ...x, steps: x.steps.filter((y) => y.id !== s.id) })))}
                  />
                ))}
              </ol>
              {!readOnly && (
                <button
                  onClick={() =>
                    edit((r) =>
                      patchComponent(r, c.id, (x) => ({ ...x, steps: [...x.steps, { id: uid("step"), action: "step", text: "" }] })),
                    )
                  }
                  className="label mt-1 text-ink/45 hover:text-oxblood"
                >
                  + step
                </button>
              )}
            </>
          )}
        </section>
      ))}

      {!readOnly && (
        <button
          onClick={() =>
            edit((r) => ({ ...r, components: [...r.components, { id: uid("comp"), name: "new component", ingredients: [], steps: [] }] }))
          }
          className="btn-ghost"
        >
          + component
        </button>
      )}
    </div>
  );
}
