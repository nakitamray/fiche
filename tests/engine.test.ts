import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/ast";
import { Library } from "@/lib/ast";
import { diffRecipes, isEmpty } from "@/lib/diff";
import { cosine, flavorMap, pca2 } from "@/lib/flavor";
import { ingestText, parseIngredientLine, parseStep, findRecipeJsonLd, jsonLdToText } from "@/lib/ingest";
import { guardrails, ratios, scaleToFlour, setHydration } from "@/lib/math";
import {
  checkout,
  cherryPickComponent,
  commit,
  createBranch,
  headCommit,
  history,
  initRepo,
  isDirty,
  layout,
  merge,
  workingTree,
} from "@/lib/repo";
import { seedLibrary } from "@/lib/seed";
import { cookbookTypst } from "@/lib/typst";
import { parseQuantity, toGrams } from "@/lib/units";

const lean: Recipe = {
  title: "test loaf",
  components: [
    {
      id: "d",
      name: "dough",
      ingredients: [
        { id: "f", name: "bread flour", grams: 500, kind: "flour" },
        { id: "w", name: "water", grams: 350, kind: "liquid" },
        { id: "s", name: "salt", grams: 10, kind: "salt" },
        { id: "y", name: "instant yeast", grams: 5, kind: "leavening" },
      ],
      steps: [{ id: "b", action: "bake", text: "bake", temp_c: 230, duration_min: 40 }],
    },
  ],
};

const look = { linen: "linen", plate: "plain", pastry: "slab" } as const;

describe("units", () => {
  it("parses fractions, unicode and ranges", () => {
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("1½")).toBe(1.5);
    expect(parseQuantity("¾")).toBe(0.75);
    expect(parseQuantity("2-3")).toBe(2.5);
    expect(parseQuantity("abc")).toBeUndefined();
  });

  it("converts volume to mass by density", () => {
    expect(toGrams(1, "cup", "bread flour")).toBe(127);
    expect(toGrams(1, "cup", "all-purpose flour")).toBe(120);
    expect(toGrams(2, "each", "large eggs")).toBe(100);
    expect(toGrams(1, "stick", "butter")).toBe(113);
    expect(toGrams(1, "cup", "mystery dust")).toBeUndefined();
  });
});

describe("baker's math", () => {
  it("computes ratios against total flour", () => {
    const r = ratios(lean);
    expect(r.flour_g).toBe(500);
    expect(r.hydration_pct).toBe(70);
    expect(r.salt_pct).toBe(2);
  });

  it("scales everything by flour", () => {
    const r = scaleToFlour(lean, 1000);
    expect(ratios(r).flour_g).toBe(1000);
    expect(r.components[0].ingredients.find((i) => i.id === "w")!.grams).toBe(700);
    expect(ratios(r).hydration_pct).toBe(70);
  });

  it("hits a hydration target by moving only liquids", () => {
    const r = setHydration(lean, 80);
    expect(ratios(r).hydration_pct).toBe(80);
    expect(r.components[0].ingredients.find((i) => i.id === "s")!.grams).toBe(10);
  });

  it("warns about slack doughs without strong flour", () => {
    const weak = JSON.parse(JSON.stringify(lean)) as Recipe;
    weak.components[0].ingredients[0].name = "all-purpose flour";
    expect(guardrails(setHydration(weak, 85)).some((g) => g.id === "slack")).toBe(true);
    // a batter isn't a dough: no yeast, no slack-dough warning
    weak.components[0].ingredients = weak.components[0].ingredients.filter((i) => i.kind !== "leavening");
    expect(guardrails(setHydration(weak, 110)).some((g) => g.id === "slack")).toBe(false);
    expect(guardrails(setHydration(lean, 85)).some((g) => g.id === "slack")).toBe(false);
  });
});

describe("repo", () => {
  it("commits, branches, and keeps a DAG", () => {
    let repo = initRepo("loaf", lean, look, { date: "2026-01-01T00:00:00.000Z" });
    const root = headCommit(repo).hash;
    repo = createBranch(repo, "Wetter Test!");
    expect(repo.head).toBe("wetter-test");
    repo = { ...repo, draft: setHydration(workingTree(repo), 78) };
    expect(isDirty(repo)).toBe(true);
    repo = commit(repo, "wetter", { date: "2026-01-02T00:00:00.000Z" });
    expect(isDirty(repo)).toBe(false);
    expect(history(repo, repo.branches["wetter-test"]).map((c) => c.hash)).toContain(root);
    expect(repo.branches.main).toBe(root);

    repo = checkout(repo, "main");
    repo = merge(repo, "wetter-test");
    expect(repo.branches.main).toBe(repo.branches["wetter-test"]); // fast-forward
    expect(layout(repo).lanes[0]).toBe("main");
  });

  it("hashes are content-addressed", () => {
    const a = initRepo("a", lean, look, { date: "2026-01-01T00:00:00.000Z" });
    const b = initRepo("b", lean, look, { date: "2026-01-01T00:00:00.000Z" });
    expect(a.branches.main).toBe(b.branches.main);
  });

  it("cherry-picks a component with fresh ids and provenance", () => {
    const lib = seedLibrary();
    const target = initRepo("loaf", lean, look);
    const source = lib.repos.find((r) => r.slug === "pistachio-croissant")!;
    const comp = headCommit(source).recipe.components[1];
    const out = cherryPickComponent(target, source, source.branches.main, comp.id);
    const grafted = workingTree(out).components.at(-1)!;
    expect(grafted.name).toBe(comp.name);
    expect(grafted.id).not.toBe(comp.id);
    expect(grafted.origin?.repo).toBe("pistachio-croissant");
  });
});

describe("diff", () => {
  it("reports gram and temperature deltas, not text noise", () => {
    const b = JSON.parse(JSON.stringify(lean)) as Recipe;
    b.components[0].ingredients[1].grams = 365;
    b.components[0].steps[0].temp_c = 220;
    const d = diffRecipes(lean, b);
    expect(d.summary).toContain("+15 g water");
    expect(d.summary).toContain("−10°C bake");
    expect(isEmpty(diffRecipes(lean, lean))).toBe(true);
  });

  it("matches renamed ingredients by id", () => {
    const b = JSON.parse(JSON.stringify(lean)) as Recipe;
    b.components[0].ingredients[1].name = "whole milk";
    const ing = diffRecipes(lean, b).components[0].ingredients.find((i) => i.name === "whole milk")!;
    expect(ing.change).toBe("changed");
    expect(ing.renamed).toBe("water");
  });
});

describe("ingest", () => {
  it("parses ingredient lines", () => {
    expect(parseIngredientLine("2 1/4 cups bread flour")).toMatchObject({ name: "bread flour", grams: 286, kind: "flour" });
    expect(parseIngredientLine("- 1 cup (227g) unsalted butter, softened")).toMatchObject({ grams: 227, kind: "fat" });
    expect(parseIngredientLine("2 large eggs")).toMatchObject({ grams: 100, kind: "egg" });
    expect(parseIngredientLine("500g strong flour")).toMatchObject({ grams: 500, kind: "flour" });
    expect(parseIngredientLine("1 handful of joy")?.grams).toBe(0);
  });

  it("pulls temperature and time from steps", () => {
    expect(parseStep("Bake at 375°F for 20-25 minutes.")).toMatchObject({ action: "bake", temp_c: 191, duration_min: 23 });
    expect(parseStep("Let it rise for 1 hour 30 minutes")).toMatchObject({ action: "rise", duration_min: 90 });
  });

  it("splits sections into components", () => {
    const { recipe } = ingestText(`Lemon Buns

For the dough:
3 cups all-purpose flour
1 cup whole milk
2 tsp instant yeast
1 tsp salt

For the glaze:
1 cup powdered sugar
2 tbsp lemon juice

Method
Mix the flour, milk, yeast and salt and knead for 10 minutes.
Whisk the powdered sugar and lemon juice into a glaze.
Bake at 190C for 18 minutes.`);
    expect(recipe.title).toBe("lemon buns");
    expect(recipe.components.map((c) => c.name)).toEqual(["dough", "glaze"]);
    expect(recipe.components[1].steps[0].action).toBe("whisk");
    expect(ratios(recipe).flour_g).toBe(360);
  });

  it("reads schema.org JSON-LD", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"Recipe","name":"Scones","recipeIngredient":["2 cups all-purpose flour","1/2 cup heavy cream"],"recipeInstructions":[{"@type":"HowToStep","text":"Bake at 400F for 15 minutes."}]}]}</script>`;
    const node = findRecipeJsonLd(html)!;
    const { recipe } = ingestText(jsonLdToText(node));
    expect(recipe.title).toBe("scones");
    expect(recipe.components[0].ingredients).toHaveLength(2);
    expect(recipe.components[0].steps[0].temp_c).toBe(204);
  });
});

describe("seed + exports", () => {
  it("seed library is valid and deterministic", () => {
    const a = seedLibrary();
    expect(Library.safeParse(a).success).toBe(true);
    expect(JSON.stringify(seedLibrary())).toBe(JSON.stringify(a));
    expect(a.repos).toHaveLength(9);
  });

  it("flavor map places every bake and links neighbours", () => {
    const { points, edges } = flavorMap(seedLibrary().repos);
    expect(points).toHaveLength(9);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
    }
    expect(edges.length).toBeGreaterThan(0);
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(pca2([[0, 0], [1, 1], [2, 2]])).toHaveLength(3);
  });

  it("writes typst for the main tip of every repo", () => {
    const src = cookbookTypst(seedLibrary().repos, { title: "fiche" });
    expect(src).toContain('#recipe(');
    expect(src.match(/#recipe\(/g)).toHaveLength(9);
    expect(src).toContain("cardamom knots");
  });
});
