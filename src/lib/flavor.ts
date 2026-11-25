import type { Recipe, Repo } from "./ast";
import { ratios } from "./math";
import { headCommit, lastTasting } from "./repo";
import { round } from "./units";

/**
 * Flavor vectors. Each bake becomes a small vector: a handful of flavor axes
 * scored from ingredient names and tasting notes, plus its structural
 * ratios. Locally it's projected to 2D with PCA; with a database the same
 * vector goes into pgvector (see supabase/migrations).
 */

export const AXES = {
  nutty: ["brown butter", "browned butter", "hazelnut", "almond", "pistachio", "walnut", "pecan", "toasted", "praline", "frangipane", "nutty", "sesame"],
  caramel: ["caramel", "brown sugar", "muscovado", "toffee", "maple", "honey", "burnt", "dulce", "molasses", "caramelized", "caramelised"],
  bright: ["lemon", "orange", "yuzu", "lime", "citrus", "zest", "rhubarb", "bright", "tangy", "sour", "passion"],
  berry: ["blueberr", "raspberr", "strawberr", "cherry", "blackcurrant", "jam", "berry", "fig", "plum", "apricot"],
  spice: ["cardamom", "cinnamon", "clove", "ginger", "nutmeg", "allspice", "pepper", "spiced", "chai", "anise"],
  floral: ["rose", "lavender", "orange blossom", "elderflower", "violet", "jasmine", "floral", "hibiscus"],
  cocoa: ["chocolate", "cocoa", "cacao", "ganache", "mocha", "coffee", "espresso"],
  custard: ["custard", "cream cheese", "pastry cream", "creme", "crème", "egg yolk", "flan", "vanilla", "cheese"],
} as const;

export type Axis = keyof typeof AXES;
export const AXIS_NAMES = Object.keys(AXES) as Axis[];

export interface FlavorPoint {
  slug: string;
  title: string;
  vector: number[];
  axes: Record<Axis, number>;
  /** strongest flavor axis, or "plain" when nothing registers (a butter croissant) */
  dominant: Axis | "plain";
  x: number;
  y: number;
}

function textOf(recipe: Recipe, notes?: string): string {
  return [
    recipe.title,
    ...recipe.components.flatMap((c) => [c.name, ...c.ingredients.map((i) => i.name)]),
    notes ?? "",
  ]
    .join(" ")
    .toLowerCase()
    // texture words that happen to contain flavor words
    .replace(/honeycomb/g, "comb");
}

export function flavorAxes(recipe: Recipe, notes?: string): Record<Axis, number> {
  const t = textOf(recipe, notes);
  const out = {} as Record<Axis, number>;
  for (const axis of AXIS_NAMES) {
    out[axis] = AXES[axis].reduce((n, word) => n + (t.split(word).length - 1), 0);
  }
  return out;
}

export function embed(recipe: Recipe, notes?: string): { vector: number[]; axes: Record<Axis, number> } {
  const axes = flavorAxes(recipe, notes);
  const r = ratios(recipe);
  const flavor = AXIS_NAMES.map((a) => Math.log1p(axes[a]));
  const structure = [r.hydration_pct / 100, r.fat_pct / 100, r.sugar_pct / 100, r.egg_pct / 100].map((v) => v * 0.8);
  const vector = [...flavor, ...structure];
  const len = Math.hypot(...vector) || 1;
  return { vector: vector.map((v) => v / len), axes };
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** top-2 principal components by power iteration — plenty for a dozen bakes */
export function pca2(vectors: number[][]): Array<[number, number]> {
  const n = vectors.length;
  if (!n) return [];
  const d = vectors[0].length;
  const mean = Array.from({ length: d }, (_, j) => vectors.reduce((s, v) => s + v[j], 0) / n);
  const X = vectors.map((v) => v.map((x, j) => x - mean[j]));
  const cov = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0) / Math.max(1, n - 1)),
  );

  const power = (m: number[][], seed: number): number[] => {
    let v = Array.from({ length: d }, (_, i) => Math.sin(i * 12.9898 + seed) + 1.1);
    for (let it = 0; it < 100; it++) {
      const w = m.map((row) => row.reduce((s, x, j) => s + x * v[j], 0));
      const len = Math.hypot(...w) || 1;
      v = w.map((x) => x / len);
    }
    return v;
  };

  const pc1 = power(cov, 1);
  const lambda1 = pc1.reduce((s, x, i) => s + x * cov[i].reduce((t, y, j) => t + y * pc1[j], 0), 0);
  const deflated = cov.map((row, i) => row.map((x, j) => x - lambda1 * pc1[i] * pc1[j]));
  const pc2 = power(deflated, 7);

  return X.map((row) => [
    row.reduce((s, x, j) => s + x * pc1[j], 0),
    row.reduce((s, x, j) => s + x * pc2[j], 0),
  ]);
}

export function flavorMap(repos: Repo[]): { points: FlavorPoint[]; edges: Array<[number, number, number]> } {
  const base = repos.map((repo) => {
    const recipe = headCommit(repo).recipe;
    const notes = lastTasting(repo)?.tasting.notes;
    const { vector, axes } = embed(recipe, notes);
    const top = AXIS_NAMES.reduce((best, a) => (axes[a] > axes[best] ? a : best), AXIS_NAMES[0]);
    const dominant: Axis | "plain" = axes[top] > 0 ? top : "plain";
    return { slug: repo.slug, title: recipe.title, vector, axes, dominant };
  });
  const xy = pca2(base.map((b) => b.vector));
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const scale = (v: number, lo: number, hi: number) => (hi - lo < 1e-9 ? 0.5 : (v - lo) / (hi - lo));
  const points = base.map((b, i) => ({
    ...b,
    x: round(0.1 + 0.8 * scale(xs[i], Math.min(...xs), Math.max(...xs)), 4),
    y: round(0.12 + 0.76 * scale(ys[i], Math.min(...ys), Math.max(...ys)), 4),
  }));

  const edges: Array<[number, number, number]> = [];
  for (let i = 0; i < points.length; i++) {
    // each bake keeps its two nearest neighbours, if they're close at all
    const near = points
      .map((p, j) => [j, cosine(points[i].vector, p.vector)] as const)
      .filter(([j, s]) => j !== i && s > 0.55)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    for (const [j, s] of near) {
      if (!edges.some(([a, b]) => (a === j && b === i) || (a === i && b === j))) edges.push([i, j, s]);
    }
  }
  return { points, edges };
}
