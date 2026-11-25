import type { Component, Ingredient, Recipe, Step } from "./ast";
import { bakersPct, ratios, type Ratios } from "./math";
import { round } from "./units";

/**
 * Semantic diff between two recipes. Things are matched by id first and by
 * name second, so "+15 g brown butter" shows up as a change to the butter,
 * not as one line deleted and another added.
 */

export type Change<T> =
  | { type: "added"; after: T }
  | { type: "removed"; before: T }
  | { type: "changed"; before: T; after: T }
  | { type: "same"; before: T; after: T };

export interface IngredientDelta {
  change: Change<Ingredient>["type"];
  name: string;
  before?: { grams: number; pct: number };
  after?: { grams: number; pct: number };
  dGrams: number;
  dPct: number;
  renamed?: string;
}

export interface StepDelta {
  change: Change<Step>["type"];
  before?: Step;
  after?: Step;
  dTemp?: number;
  dDuration?: number;
  textChanged: boolean;
}

export interface ComponentDiff {
  change: Change<Component>["type"];
  name: string;
  renamed?: string;
  ingredients: IngredientDelta[];
  steps: StepDelta[];
}

export interface RecipeDiff {
  ratios: Array<{ key: keyof Ratios; before: number; after: number; delta: number }>;
  components: ComponentDiff[];
  summary: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pair<T extends { id: string }>(
  a: T[],
  b: T[],
  key: (t: T) => string,
): Array<[T | undefined, T | undefined]> {
  const out: Array<[T | undefined, T | undefined]> = [];
  const used = new Set<T>();
  for (const x of a) {
    const y = b.find((t) => !used.has(t) && t.id === x.id) ?? b.find((t) => !used.has(t) && key(t) === key(x));
    if (y) used.add(y);
    out.push([x, y]);
  }
  for (const y of b) if (!used.has(y)) out.push([undefined, y]);
  return out;
}

function diffIngredients(a: Recipe, b: Recipe, ca?: Component, cb?: Component): IngredientDelta[] {
  return pair(ca?.ingredients ?? [], cb?.ingredients ?? [], (i) => norm(i.name)).map(([x, y]) => {
    const before = x ? { grams: x.grams, pct: bakersPct(x, a) } : undefined;
    const after = y ? { grams: y.grams, pct: bakersPct(y, b) } : undefined;
    const dGrams = round((after?.grams ?? 0) - (before?.grams ?? 0), 1);
    const dPct = round((after?.pct ?? 0) - (before?.pct ?? 0), 1);
    const renamed = x && y && norm(x.name) !== norm(y.name) ? x.name : undefined;
    const change: IngredientDelta["change"] = !x
      ? "added"
      : !y
        ? "removed"
        : dGrams !== 0 || renamed || x.kind !== y.kind || x.replaces !== y.replaces
          ? "changed"
          : "same";
    return { change, name: (y ?? x)!.name, before, after, dGrams, dPct, renamed };
  });
}

function diffSteps(ca?: Component, cb?: Component): StepDelta[] {
  const a = ca?.steps ?? [];
  const b = cb?.steps ?? [];
  return pair(a, b, (s) => `${a.indexOf(s) >= 0 ? a.indexOf(s) : b.indexOf(s)}:${norm(s.action)}`).map(([x, y]) => {
    if (!x) return { change: "added", after: y, textChanged: true };
    if (!y) return { change: "removed", before: x, textChanged: true };
    const dTemp = x.temp_c !== undefined || y.temp_c !== undefined ? (y.temp_c ?? 0) - (x.temp_c ?? 0) : undefined;
    const dDuration =
      x.duration_min !== undefined || y.duration_min !== undefined ? (y.duration_min ?? 0) - (x.duration_min ?? 0) : undefined;
    const textChanged = x.text !== y.text || norm(x.action) !== norm(y.action);
    const changed = textChanged || !!dTemp || !!dDuration;
    return {
      change: changed ? "changed" : "same",
      before: x,
      after: y,
      dTemp: dTemp || undefined,
      dDuration: dDuration || undefined,
      textChanged,
    };
  });
}

const sign = (n: number, unit = "") => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)}${unit}`;

export function diffRecipes(a: Recipe, b: Recipe): RecipeDiff {
  const ra = ratios(a);
  const rb = ratios(b);
  const keys: Array<keyof Ratios> = ["flour_g", "hydration_pct", "fat_pct", "sugar_pct", "salt_pct", "egg_pct"];
  const ratioRows = keys.map((key) => ({ key, before: ra[key], after: rb[key], delta: round(rb[key] - ra[key], 1) }));

  const components: ComponentDiff[] = pair(a.components, b.components, (c) => norm(c.name)).map(([x, y]) => {
    const ingredients = diffIngredients(a, b, x, y);
    const steps = diffSteps(x, y);
    const renamed = x && y && norm(x.name) !== norm(y.name) ? x.name : undefined;
    const touched = ingredients.some((i) => i.change !== "same") || steps.some((s) => s.change !== "same") || !!renamed;
    return {
      change: !x ? "added" : !y ? "removed" : touched ? "changed" : "same",
      name: (y ?? x)!.name,
      renamed,
      ingredients,
      steps,
    };
  });

  const summary: string[] = [];
  for (const c of components) {
    if (c.change === "added") summary.push(`+ ${c.name}`);
    if (c.change === "removed") summary.push(`− ${c.name}`);
    for (const i of c.ingredients) {
      if (i.change === "added") summary.push(`+${i.after!.grams} g ${i.name}`);
      else if (i.change === "removed") summary.push(`−${i.before!.grams} g ${i.name}`);
      else if (i.change === "changed" && i.dGrams) summary.push(`${sign(i.dGrams, " g")} ${i.name}`);
      else if (i.change === "changed" && i.renamed) summary.push(`${i.renamed} → ${i.name}`);
    }
    for (const s of c.steps) {
      const label = (s.after ?? s.before)!.action;
      if (s.dTemp) summary.push(`${sign(s.dTemp, "°C")} ${label}`);
      if (s.dDuration) summary.push(`${sign(s.dDuration, " min")} ${label}`);
      if (s.change === "added") summary.push(`+ step: ${label}`);
      if (s.change === "removed") summary.push(`− step: ${label}`);
    }
  }
  return { ratios: ratioRows, components, summary };
}

export function isEmpty(d: RecipeDiff): boolean {
  return d.components.every((c) => c.change === "same") && d.ratios.every((r) => r.delta === 0);
}
