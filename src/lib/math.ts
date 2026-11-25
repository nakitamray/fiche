import type { Component, Ingredient, Recipe } from "./ast";
import { lookup, waterFraction } from "./density";
import { round } from "./units";

export interface Ratios {
  flour_g: number;
  hydration_pct: number;
  fat_pct: number;
  sugar_pct: number;
  salt_pct: number;
  egg_pct: number;
  leavening_pct: number;
  total_g: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** components that contain flour — the ones baker's math is about */
export function doughComponents(recipe: Recipe): Component[] {
  const withFlour = recipe.components.filter((c) => c.ingredients.some((i) => i.kind === "flour"));
  return withFlour.length ? withFlour : recipe.components;
}

export function totalFlour(recipe: Recipe): number {
  return sum(doughComponents(recipe).flatMap((c) => c.ingredients.filter((i) => i.kind === "flour").map((i) => i.grams)));
}

/** baker's percentage of a single ingredient, against total recipe flour */
export function bakersPct(ing: Ingredient, recipe: Recipe): number {
  const flour = totalFlour(recipe);
  return flour ? round((ing.grams / flour) * 100, 1) : 0;
}

export function ratios(recipe: Recipe): Ratios {
  const dough = doughComponents(recipe).flatMap((c) => c.ingredients);
  const flour = sum(dough.filter((i) => i.kind === "flour").map((i) => i.grams));
  const pct = (g: number) => (flour ? round((g / flour) * 100, 1) : 0);
  const of = (kind: Ingredient["kind"]) => sum(dough.filter((i) => i.kind === kind).map((i) => i.grams));

  const water = sum(dough.map((i) => i.grams * waterFraction(i.name, i.kind)));
  // butter is ~82% fat; count the fat, not the water
  const fat = sum(
    dough.filter((i) => i.kind === "fat").map((i) => i.grams * (1 - waterFraction(i.name, i.kind))),
  );

  return {
    flour_g: round(flour),
    hydration_pct: pct(water),
    fat_pct: pct(fat),
    sugar_pct: pct(of("sugar")),
    salt_pct: pct(of("salt")),
    egg_pct: pct(of("egg")),
    leavening_pct: pct(of("leavening")),
    total_g: round(sum(recipe.components.flatMap((c) => c.ingredients.map((i) => i.grams)))),
  };
}

function mapIngredients(recipe: Recipe, fn: (i: Ingredient, c: Component) => Ingredient): Recipe {
  return {
    ...recipe,
    components: recipe.components.map((c) => ({ ...c, ingredients: c.ingredients.map((i) => fn(i, c)) })),
  };
}

/** scale the whole recipe so total flour hits `target` grams */
export function scaleToFlour(recipe: Recipe, target: number): Recipe {
  const flour = totalFlour(recipe);
  if (!flour || target <= 0) return recipe;
  const k = target / flour;
  return mapIngredients(recipe, (i) => ({ ...i, grams: round(i.grams * k, i.grams < 20 ? 1 : 0) }));
}

/**
 * Move hydration to `target` % by scaling the plain liquids (water, milk) in
 * the dough. Eggs, butter and cream stay where they are — changing them
 * changes the recipe, not just its hydration.
 */
export function setHydration(recipe: Recipe, target: number): Recipe {
  const dough = new Set(doughComponents(recipe).map((c) => c.id));
  const current = ratios(recipe);
  const flour = current.flour_g;
  if (!flour) return recipe;

  const liquids = recipe.components
    .filter((c) => dough.has(c.id))
    .flatMap((c) => c.ingredients)
    .filter((i) => i.kind === "liquid");
  const liquidWater = sum(liquids.map((i) => i.grams * waterFraction(i.name, i.kind)));
  if (!liquidWater) return recipe;

  const otherWater = (current.hydration_pct / 100) * flour - liquidWater;
  const neededFromLiquids = Math.max(0, (target / 100) * flour - otherWater);
  const k = neededFromLiquids / liquidWater;

  return mapIngredients(recipe, (i, c) =>
    dough.has(c.id) && i.kind === "liquid" ? { ...i, grams: round(i.grams * k) } : i,
  );
}

export type Severity = "note" | "warn";
export interface Guardrail {
  id: string;
  severity: Severity;
  text: string;
}

const isYeasted = (r: Recipe) =>
  doughComponents(r).some((c) => c.ingredients.some((i) => /yeast|levain|starter/i.test(i.name)));
const hasStrongFlour = (r: Recipe) =>
  doughComponents(r).some((c) =>
    c.ingredients.some((i) => i.kind === "flour" && /bread|strong|high[- ]protein|manitoba|t65/i.test(i.name)),
  );

/**
 * Heuristics, not physics. These are the things I kept having to relearn,
 * written down so the app nags me instead.
 */
export function guardrails(recipe: Recipe): Guardrail[] {
  const r = ratios(recipe);
  const out: Guardrail[] = [];
  const yeasted = isYeasted(recipe);
  const steps = recipe.components.flatMap((c) => c.steps);

  if (!r.flour_g) {
    out.push({ id: "no-flour", severity: "note", text: "no flour in this recipe, so baker's percentages are off." });
    return out;
  }
  if (yeasted && r.hydration_pct > 82 && !hasStrongFlour(recipe)) {
    out.push({
      id: "slack",
      severity: "warn",
      text: `hydration ${r.hydration_pct}% without a high-protein flour — expect a slack dough. coil folds, or swap in bread flour.`,
    });
  }
  if (yeasted && r.salt_pct > 0 && (r.salt_pct < 1.5 || r.salt_pct > 2.5)) {
    out.push({
      id: "salt",
      severity: r.salt_pct > 2.5 ? "warn" : "note",
      text: `salt at ${r.salt_pct}%. most yeasted doughs live between 1.8 and 2.2%.`,
    });
  }
  if (yeasted && r.salt_pct === 0) {
    out.push({ id: "no-salt", severity: "warn", text: "yeasted dough with no salt. on purpose?" });
  }
  if (yeasted && r.sugar_pct > 12) {
    out.push({
      id: "osmo",
      severity: "note",
      text: `sugar at ${r.sugar_pct}% slows regular yeast. use osmotolerant (gold) yeast or give it a longer proof.`,
    });
  }
  if (yeasted && r.fat_pct > 25) {
    const autolyse = steps.some((s) => /autolyse|knead|mix/i.test(s.action));
    out.push({
      id: "fat",
      severity: "note",
      text: `fat at ${r.fat_pct}%. add butter in stages after gluten is built${autolyse ? "" : " (no mixing step yet)"}.`,
    });
  }
  for (const s of steps) {
    if (s.temp_c !== undefined && s.temp_c > 250) {
      out.push({ id: `hot-${s.id}`, severity: "warn", text: `${s.action} at ${s.temp_c}°C is hotter than most home ovens go.` });
    }
    if (/proof|rise/i.test(s.action) && s.temp_c !== undefined && s.temp_c > 29 && r.fat_pct > 15) {
      out.push({
        id: `melt-${s.id}`,
        severity: "warn",
        text: `proofing an enriched or laminated dough at ${s.temp_c}°C — the butter will start to weep. keep it under 27°C.`,
      });
    }
  }
  for (const c of recipe.components) {
    for (const i of c.ingredients) {
      if (i.grams === 0) out.push({ id: `zero-${i.id}`, severity: "note", text: `${i.name} is 0 g in ${c.name}.` });
      if (!lookup(i.name) && i.kind === "other" && i.source) {
        out.push({ id: `unk-${i.id}`, severity: "note", text: `couldn't place "${i.name}" — check the weight by hand.` });
      }
    }
  }
  return out;
}
