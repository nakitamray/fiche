import type { Component, Ingredient, Recipe, Step } from "./ast";
import { guessKind, lookup } from "./density";
import { uid } from "./hash";
import { fToC, normalizeUnit, parseQuantity, round, toGrams } from "./units";

/**
 * Turn pasted recipe text into a Recipe AST.
 *
 * Deliberately rule-based: it runs offline, it's predictable, and when it
 * can't convert something it says so (the ingredient keeps its source line
 * and lands at 0 g) instead of inventing a number.
 */

export interface IngestReport {
  recipe: Recipe;
  unconverted: string[];
}

const INGREDIENT_HEADER = /^(ingredients?|you(?:'| wi)ll need)\b/i;
const METHOD_HEADER = /^(method|directions?|instructions?|steps?|preparation|to make)\b/i;
const FOR_THE = /^(?:for\s+the\s+)(.+?):?$/i;
const SECTION = /^([a-z][a-z\s&'-]{2,40}):$/i;
const BULLET = /^\s*(?:[-*•·▢□]|\d+[.)])\s*/;

const ACTIONS = [
  "autolyse", "mix", "knead", "rest", "bulk", "fold", "laminate", "chill", "freeze", "shape", "roll",
  "proof", "prove", "rise", "egg wash", "brush", "bake", "cool", "glaze", "fill", "pipe", "whisk",
  "cream", "melt", "brown", "simmer", "boil", "temper", "combine", "stir", "pour", "spread", "sprinkle",
  "preheat", "toast", "blend", "beat", "cut", "divide", "dust", "serve",
];

export function parseIngredientLine(line: string): Ingredient | undefined {
  const raw = line.replace(BULLET, "").trim();
  if (!raw) return undefined;

  // "500g bread flour", "1 1/2 cups milk", "2 large eggs", "a pinch of salt"
  const m = raw.match(
    /^((?:\d+\s+)?\d*[.,]?\d+(?:\s*\/\s*\d+)?(?:\s*[¼½¾⅓⅔⅛⅜⅝⅞⅕])?|[¼½¾⅓⅔⅛⅜⅝⅞⅕]|a|an|one)(?:\s*(?:-|–|to)\s*(\d+(?:[./]\d+)?))?\s*([a-zA-Z.]+(?:\s+oz)?)?\.?\s+(?:of\s+)?(.*)$/,
  );

  let qty: number | undefined;
  let unit: string | undefined;
  let name = raw;

  if (m) {
    const [, q, upper, maybeUnit, rest] = m;
    qty = /^(a|an|one)$/i.test(q) ? 1 : parseQuantity(q.replace(",", "."));
    if (qty !== undefined && upper) {
      const hi = parseQuantity(upper);
      if (hi !== undefined) qty = (qty + hi) / 2;
    }
    const u = maybeUnit ? normalizeUnit(maybeUnit.replace(/\.$/, "")) : undefined;
    if (u) {
      unit = u;
      name = rest;
    } else {
      name = [maybeUnit, rest].filter(Boolean).join(" ");
    }
  } else {
    const grams = raw.match(/^(.*?)[\s,:–-]+(\d+(?:\.\d+)?)\s*(g|kg|ml)\b/i);
    if (grams) {
      name = grams[1];
      qty = Number(grams[2]);
      unit = normalizeUnit(grams[3]);
    }
  }

  // pull "(120 g)" style weights out of the name — they beat any conversion
  const paren = name.match(/\((?:about\s+)?(\d+(?:\.\d+)?)\s*(g|grams?|kg|ml)\)/i);
  let grams: number | undefined;
  if (paren) {
    const u = normalizeUnit(paren[2]);
    grams = toGrams(Number(paren[1]), u, name);
    name = name.replace(paren[0], " ");
  }

  name = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/,\s*(at room temperature|softened|melted|cold|cubed|divided|sifted|plus more.*|for dusting.*|to taste)$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!name) return undefined;

  if (grams === undefined && qty !== undefined) grams = toGrams(qty, unit, name);

  return {
    id: uid("ing"),
    name,
    grams: grams !== undefined ? round(grams, grams < 10 ? 1 : 0) : 0,
    kind: guessKind(name),
    source: grams === undefined ? raw : undefined,
  };
}

export function parseStep(text: string): Step {
  const clean = text.replace(BULLET, "").replace(/^step\s*\d+[:.]?\s*/i, "").trim();
  const lower = clean.toLowerCase();

  // the verb that appears first wins: "whisk ... into a glaze" is whisking
  const action =
    ACTIONS.map((a) => [a, lower.search(new RegExp(`\\b${a}`))] as const)
      .filter(([, at]) => at >= 0)
      .sort((x, y) => x[1] - y[1])[0]?.[0] ??
    lower.split(/\s+/)[0]?.replace(/[^a-z]/g, "") ??
    "step";

  let temp_c: number | undefined;
  const t = clean.match(/(\d{2,3})\s*°?\s*(c|f)\b/i) ?? clean.match(/(\d{2,3})\s*degrees?\s*(c|f)?/i);
  if (t) {
    const v = Number(t[1]);
    const unit = (t[2] ?? (v > 120 ? "f" : "c")).toLowerCase();
    temp_c = unit === "f" ? fToC(v) : v;
  }

  let duration_min: number | undefined;
  const range = "(\\d+(?:\\.\\d+)?)(?:\\s*(?:-|–|to)\\s*(\\d+(?:\\.\\d+)?))?";
  const h = clean.match(new RegExp(`${range}\\s*(?:hours?|hrs?|h)\\b`, "i"));
  const mi = clean.match(new RegExp(`${range}\\s*(?:minutes?|mins?|m)\\b`, "i"));
  const mid = (a: string, b?: string) => (b ? (Number(a) + Number(b)) / 2 : Number(a));
  if (h) duration_min = mid(h[1], h[2]) * 60;
  if (mi) duration_min = (duration_min ?? 0) + mid(mi[1], mi[2]);
  if (/overnight/i.test(clean) && duration_min === undefined) duration_min = 720;

  return {
    id: uid("step"),
    action: action === "prove" ? "proof" : action,
    text: clean,
    temp_c,
    duration_min: duration_min !== undefined ? round(duration_min) : undefined,
  };
}

function looksLikeIngredient(line: string): boolean {
  const s = line.replace(BULLET, "");
  if (/^(\d|[¼½¾⅓⅔⅛⅜⅝⅞]|a pinch|a few|pinch)/i.test(s) && s.length < 90) return true;
  if (/\b\d+\s*(g|kg|ml)\b/i.test(s) && s.length < 70) return true;
  return false;
}

export function ingestText(text: string, fallbackTitle = "untitled"): IngestReport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let title = fallbackTitle;
  let mode: "head" | "ingredients" | "method" = "head";
  const components: Component[] = [];
  const methodSteps: Step[] = [];
  let current: Component | undefined;

  const ensure = (name: string) => {
    current = { id: uid("comp"), name, ingredients: [], steps: [] };
    components.push(current);
    return current;
  };

  for (const [idx, line] of lines.entries()) {
    if (idx === 0 && !looksLikeIngredient(line) && !INGREDIENT_HEADER.test(line)) {
      title = line.replace(/^#+\s*/, "").toLowerCase();
      continue;
    }
    if (INGREDIENT_HEADER.test(line) && line.length < 40) {
      mode = "ingredients";
      continue;
    }
    if (METHOD_HEADER.test(line) && line.length < 40) {
      mode = "method";
      continue;
    }
    const forThe = line.match(FOR_THE) ?? line.match(SECTION);
    if (forThe && line.length < 50 && !looksLikeIngredient(line)) {
      if (mode === "method") continue; // sub-headers inside the method, e.g. "to finish:"
      ensure(forThe[1].trim().toLowerCase());
      mode = "ingredients";
      continue;
    }
    const shortLine = mode === "ingredients" && line.length < 60 && !/[.!?]$/.test(line);
    if ((mode === "ingredients" || mode === "head") && (looksLikeIngredient(line) || shortLine)) {
      const ing = parseIngredientLine(line);
      if (ing) (current ?? ensure("dough")).ingredients.push(ing);
      mode = "ingredients";
      continue;
    }
    if (mode === "method" || (mode === "ingredients" && line.length > 50)) {
      mode = "method";
      methodSteps.push(parseStep(line));
    }
  }

  if (!components.length) ensure("dough");
  assignSteps(components, methodSteps);

  const unconverted = components.flatMap((c) => c.ingredients.filter((i) => i.source).map((i) => i.source!));
  return { recipe: { title, components }, unconverted };
}

/**
 * Steps come in one list but belong to components. A step goes to the
 * component whose ingredients it mentions most; ties go to the first
 * component (usually the dough).
 */
function assignSteps(components: Component[], steps: Step[]) {
  for (const step of steps) {
    const text = step.text.toLowerCase();
    let best = components[0];
    let bestScore = 0;
    for (const c of components) {
      let score = text.includes(c.name) ? 3 : 0;
      for (const i of c.ingredients) {
        const word = (lookup(i.name)?.label ?? i.name).split(" ").pop()!;
        if (word.length > 2 && text.includes(word)) score++;
      }
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    best.steps.push(step);
  }
}

/** schema.org Recipe → plain text, so URL ingest reuses the same parser */
export function jsonLdToText(node: Record<string, unknown>): string {
  const out: string[] = [];
  if (typeof node.name === "string") out.push(node.name);
  out.push("ingredients");
  const ings = (node.recipeIngredient ?? node.ingredients) as unknown;
  if (Array.isArray(ings)) out.push(...ings.map(String));
  out.push("method");
  const flatten = (x: unknown): string[] => {
    if (!x) return [];
    if (typeof x === "string") return x.split(/\n+/);
    if (Array.isArray(x)) return x.flatMap(flatten);
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      if (o["@type"] === "HowToSection") return flatten(o.itemListElement);
      if (typeof o.text === "string") return [o.text];
    }
    return [];
  };
  out.push(...flatten(node.recipeInstructions));
  return out.map((l) => decodeEntities(l.replace(/<[^>]+>/g, " ").trim())).filter(Boolean).join("\n");
}

export function findRecipeJsonLd(html: string): Record<string, unknown> | undefined {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const isRecipe = (n: Record<string, unknown>) =>
    n["@type"] === "Recipe" || (Array.isArray(n["@type"]) && (n["@type"] as unknown[]).includes("Recipe"));
  const walk = (n: unknown): Record<string, unknown> | undefined => {
    if (!n || typeof n !== "object") return undefined;
    if (Array.isArray(n)) {
      for (const x of n) {
        const hit = walk(x);
        if (hit) return hit;
      }
      return undefined;
    }
    const o = n as Record<string, unknown>;
    if (isRecipe(o)) return o;
    return walk(o["@graph"]);
  };
  for (const [, body] of blocks) {
    try {
      const hit = walk(JSON.parse(body));
      if (hit) return hit;
    } catch {
      // some sites ship broken JSON-LD; skip it
    }
  }
  return undefined;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&frac12;/g, "½")
    .replace(/&frac14;/g, "¼")
    .replace(/&frac34;/g, "¾");
}
