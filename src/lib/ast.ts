import { z } from "zod";

/**
 * The recipe AST.
 *
 * A recipe is never stored as prose. It is a list of components (dough,
 * filling, glaze...), each with typed ingredients in grams and ordered steps.
 * Everything else (baker's percentages, hydration, diffs) is derived from it.
 */

export const IngredientKind = z.enum([
  "flour",
  "liquid",
  "dairy",
  "fat",
  "sugar",
  "egg",
  "salt",
  "leavening",
  "flavor",
  "inclusion",
  "other",
]);
export type IngredientKind = z.infer<typeof IngredientKind>;

export const Ingredient = z.object({
  id: z.string(),
  name: z.string(),
  grams: z.number().nonnegative(),
  kind: IngredientKind,
  /** what this ingredient stands in for, e.g. "1 large egg" */
  replaces: z.string().optional(),
  /** the original line before normalization, kept for reference */
  source: z.string().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;

export const Step = z.object({
  id: z.string(),
  action: z.string(),
  text: z.string(),
  duration_min: z.number().optional(),
  temp_c: z.number().optional(),
});
export type Step = z.infer<typeof Step>;

export const Component = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(Ingredient),
  steps: z.array(Step),
  /** set when the component was cherry-picked from another recipe */
  origin: z
    .object({ repo: z.string(), commit: z.string(), component: z.string() })
    .optional(),
});
export type Component = z.infer<typeof Component>;

export const Recipe = z.object({
  title: z.string(),
  yield: z.string().optional(),
  components: z.array(Component),
});
export type Recipe = z.infer<typeof Recipe>;

export const TastingLog = z.object({
  crumb_score: z.number().min(0).max(5),
  notes: z.string(),
  baked_on: z.string().optional(),
});
export type TastingLog = z.infer<typeof TastingLog>;

export const Stamp = z.enum(["tested", "house special", "sold out"]);
export type Stamp = z.infer<typeof Stamp>;

export const Commit = z.object({
  hash: z.string(),
  parents: z.array(z.string()),
  branch: z.string(),
  message: z.string(),
  date: z.string(),
  recipe: Recipe,
  tasting: TastingLog.optional(),
});
export type Commit = z.infer<typeof Commit>;

export const Repo = z.object({
  slug: z.string(),
  head: z.string(),
  branches: z.record(z.string(), z.string()),
  commits: z.record(z.string(), Commit),
  stamp: Stamp.optional(),
  /** uncommitted edits on the checked-out branch */
  draft: Recipe.optional(),
  created: z.string(),
});
export type Repo = z.infer<typeof Repo>;

export const Library = z.object({
  version: z.literal(1),
  repos: z.array(Repo),
});
export type Library = z.infer<typeof Library>;
