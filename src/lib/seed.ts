import type { Component, IngredientKind, Library, Recipe, Repo, Step, TastingLog } from "./ast";
import { guessKind } from "./density";
import { commit, createBranch, checkout, initRepo } from "./repo";

/**
 * The starter library: nine bakes from my notebook, with real history on a
 * couple of them so the lineage view has something to show.
 * Ids are deterministic so server and client render the same thing.
 */

type I = [name: string, grams: number, kind?: IngredientKind, replaces?: string];
type S = [action: string, text: string, duration_min?: number, temp_c?: number];

function build(slug: string, title: string, comps: Array<[string, I[], S[]]>, yieldText?: string): Recipe {
  return {
    title,
    yield: yieldText,
    components: comps.map(([name, ings, steps], ci): Component => ({
      id: `${slug}-c${ci}`,
      name,
      ingredients: ings.map(([n, g, kind, replaces], ii) => ({
        id: `${slug}-c${ci}-i${ii}`,
        name: n,
        grams: g,
        kind: kind ?? guessKind(n),
        ...(replaces ? { replaces } : {}),
      })),
      steps: steps.map(([action, text, duration_min, temp_c], si): Step => ({
        id: `${slug}-c${ci}-s${si}`,
        action,
        text,
        ...(duration_min !== undefined ? { duration_min } : {}),
        ...(temp_c !== undefined ? { temp_c } : {}),
      })),
    })),
  };
}

const day = (d: string) => `${d}T09:30:00.000Z`;
const taste = (crumb_score: number, notes: string, baked_on?: string): TastingLog => ({ crumb_score, notes, baked_on });

function edit(r: Recipe, fn: (r: Recipe) => void): Recipe {
  const copy: Recipe = JSON.parse(JSON.stringify(r));
  fn(copy);
  return copy;
}
const find = (r: Recipe, id: string) => r.components.flatMap((c) => c.ingredients).find((i) => i.id === id)!;
const findStep = (r: Recipe, id: string) => r.components.flatMap((c) => c.steps).find((s) => s.id === id)!;

/* ------------------------------------------------------------------ */

function cardamomKnots(): Repo {
  const v1 = build(
    "knots",
    "cardamom knots",
    [
      [
        "enriched dough",
        [
          ["bread flour", 500],
          ["whole milk", 260],
          ["egg", 100],
          ["sugar", 75],
          ["instant yeast", 8],
          ["fine salt", 9],
          ["unsalted butter", 90],
          ["ground cardamom", 6],
        ],
        [
          ["mix", "mix everything but the butter until no dry bits remain, then knead 6 minutes.", 6],
          ["knead", "add the butter in three goes, kneading until the dough windowpanes.", 10],
          ["bulk", "cover and leave until puffy and nearly doubled.", 75, 24],
          ["chill", "press flat, wrap, and chill so it rolls cleanly.", 60, 4],
        ],
      ],
      [
        "cardamom filling",
        [
          ["unsalted butter", 110],
          ["light brown sugar", 90],
          ["ground cardamom", 10],
          ["fine salt", 1],
        ],
        [["cream", "beat into a soft paste. keep at room temperature."]],
      ],
      [
        "pearl sugar finish",
        [
          ["egg", 25, "egg"],
          ["pearl sugar", 30, "sugar"],
        ],
        [
          ["shape", "roll to 40 × 30 cm, spread filling over half, fold, cut 12 strips, twist and knot."],
          ["proof", "proof until marshmallowy.", 45, 26],
          ["bake", "egg wash, scatter pearl sugar, bake until deep brown.", 14, 200],
        ],
      ],
    ],
    "12 knots",
  );

  let repo = initRepo("cardamom-knots", v1, { linen: "oxblood", plate: "plain", pastry: "knot" }, {
    date: day("2026-08-02"),
    message: "first write-up, from the notebook",
    tasting: taste(3.5, "good flavor, a bit bready. centre slightly dense.", "2026-08-02"),
  });

  repo = { ...repo, draft: edit(v1, (r) => { findStep(r, "knots-c2-s1").duration_min = 60; }) };
  repo = commit(repo, "longer second proof", {
    date: day("2026-08-09"),
    tasting: taste(4, "lighter crumb, knots hold shape. still want more depth.", "2026-08-09"),
  });

  // brown butter branch
  repo = createBranch(repo, "brown-butter-test");
  const bb = edit(repo.commits[repo.branches[repo.head]].recipe, (r) => {
    const f = find(r, "knots-c1-i0");
    f.name = "brown butter";
    f.grams = 95;
    find(r, "knots-c0-i6").grams = 105;
  });
  repo = { ...repo, draft: bb };
  repo = commit(repo, "brown the filling butter, more butter in the dough", {
    date: day("2026-08-16"),
    tasting: taste(4.5, "nutty, toffee edges, flaky layers where the filling caramelised. this is it.", "2026-08-16"),
  });
  repo = { ...repo, draft: edit(bb, (r) => { findStep(r, "knots-c2-s2").temp_c = 190; findStep(r, "knots-c2-s2").duration_min = 16; }) };
  repo = commit(repo, "drop oven 10°, two minutes longer", {
    date: day("2026-08-23"),
    tasting: taste(4.5, "even colour, no scorched sugar on the bottoms.", "2026-08-23"),
  });

  // eggless branch off main
  repo = checkout(repo, "main");
  repo = createBranch(repo, "eggless-cardamom-test");
  repo = {
    ...repo,
    draft: edit(repo.commits[repo.branches[repo.head]].recipe, (r) => {
      const egg = find(r, "knots-c0-i2");
      egg.name = "soy milk + cider vinegar";
      egg.kind = "liquid";
      egg.grams = 110;
      egg.replaces = "2 large eggs";
      const wash = find(r, "knots-c2-i0");
      wash.name = "oat milk + maple";
      wash.kind = "liquid";
      wash.replaces = "egg wash";
    }),
  };
  repo = commit(repo, "swap eggs for soy milk + vinegar", {
    date: day("2026-08-30"),
    tasting: taste(3.5, "soft but pale. needs more sugar in the wash for colour.", "2026-08-30"),
  });

  repo = checkout(repo, "brown-butter-test");
  return { ...repo, stamp: "house special" };
}

function pistachioCroissant(): Repo {
  const r = build(
    "pist",
    "pistachio croissant",
    [
      [
        "laminated dough",
        [
          ["t45 flour", 500],
          ["water", 140],
          ["whole milk", 140],
          ["sugar", 55],
          ["instant yeast", 7],
          ["fine salt", 10],
          ["unsalted butter", 40],
          ["butter (block)", 280, "fat"],
        ],
        [
          ["mix", "mix to a shaggy dough, knead briefly. it should be firm.", 5],
          ["chill", "flatten into a rectangle, wrap and chill overnight.", 720, 4],
          ["laminate", "lock in the butter block. one double fold, one single fold, resting 30 min between.", 90, 4],
          ["shape", "roll to 4 mm, cut triangles 9 × 25 cm, roll up tight."],
          ["proof", "proof until jiggly and tripled in volume.", 150, 26],
          ["bake", "egg wash, bake until deep amber.", 18, 190],
        ],
      ],
      [
        "pistachio frangipane",
        [
          ["pistachio paste", 120, "inclusion"],
          ["unsalted butter", 60],
          ["powdered sugar", 50],
          ["egg", 50],
          ["almond flour", 40],
        ],
        [["cream", "beat everything until smooth. pipe a line along each split croissant."]],
      ],
      [
        "finish",
        [
          ["pistachios", 30],
          ["powdered sugar", 15],
        ],
        [["bake", "fill, top with chopped pistachios, bake again until the frangipane sets.", 12, 175]],
      ],
    ],
    "12 croissants",
  );
  return initRepo("pistachio-croissant", r, { linen: "gingham", plate: "green", pastry: "croissant" }, {
    date: day("2026-07-12"),
    tasting: taste(4.5, "half sugar-dusted, half pistachio. the green plate was a good call.", "2026-07-12"),
  });
}

function blueberryDanish(): Repo {
  const r = build(
    "dan",
    "blueberry cheese danish",
    [
      [
        "danish dough",
        [
          ["all-purpose flour", 400],
          ["whole milk", 150],
          ["egg", 50],
          ["sugar", 40],
          ["instant yeast", 7],
          ["salt", 7],
          ["butter (block)", 220, "fat"],
        ],
        [
          ["mix", "mix and knead lightly, chill one hour.", 60, 4],
          ["laminate", "three single folds, chilling between.", 90, 4],
          ["shape", "cut 10 cm squares, fold corners to the middle, press a well."],
          ["proof", "proof until puffy.", 90, 25],
        ],
      ],
      [
        "cheese filling",
        [
          ["cream cheese", 200],
          ["sugar", 40],
          ["egg yolk", 18],
          ["lemon zest", 3, "flavor"],
        ],
        [["whisk", "whisk smooth. spoon into each well."]],
      ],
      [
        "berries",
        [
          ["blueberries", 180],
          ["cornstarch", 6],
        ],
        [["bake", "top with berries, bake until golden.", 16, 195]],
      ],
    ],
    "14 danishes",
  );
  return initRepo("blueberry-danish", r, { linen: "lavender", plate: "sprig", pastry: "danish" }, {
    date: day("2026-06-21"),
    tasting: taste(4, "bright, tangy cheese. berries burst a little too much — toss in more starch.", "2026-06-21"),
  });
}

function bomboloni(): Repo {
  const r = build(
    "bomb",
    "chocolate almond bomboloni",
    [
      [
        "brioche dough",
        [
          ["bread flour", 400],
          ["whole milk", 120],
          ["egg", 150],
          ["sugar", 60],
          ["instant yeast", 7],
          ["salt", 7],
          ["unsalted butter", 100],
        ],
        [
          ["knead", "knead until smooth, then work in soft butter.", 12],
          ["bulk", "cold bulk overnight.", 720, 4],
          ["shape", "divide into 50 g balls and proof.", 90, 26],
          ["fry", "fry in oil until deep golden, 2 min a side.", 4, 175],
        ],
      ],
      [
        "chocolate glaze",
        [
          ["dark chocolate", 150],
          ["heavy cream", 120],
          ["slivered almonds", 40, "inclusion"],
        ],
        [["glaze", "pour hot cream over chocolate, stir smooth, dip tops, scatter almonds."]],
      ],
    ],
    "16 bomboloni",
  );
  return initRepo("bomboloni", r, { linen: "linen", plate: "rimmed", pastry: "bomboloni" }, {
    date: day("2026-05-30"),
    tasting: taste(4, "glossy, rich. fry temp matters — 175 is right.", "2026-05-30"),
  });
}

function morningBun(): Repo {
  const r = build(
    "mbun",
    "cinnamon morning bun",
    [
      [
        "laminated dough",
        [
          ["all-purpose flour", 450],
          ["water", 120],
          ["whole milk", 120],
          ["sugar", 50],
          ["instant yeast", 7],
          ["salt", 9],
          ["butter (block)", 250, "fat"],
        ],
        [
          ["mix", "mix, knead briefly, chill overnight.", 720, 4],
          ["laminate", "lock in butter, two letter folds.", 75, 4],
        ],
      ],
      [
        "cinnamon sugar",
        [
          ["light brown sugar", 100],
          ["sugar", 50],
          ["cinnamon", 8, "flavor"],
          ["orange zest", 4, "flavor"],
        ],
        [
          ["shape", "roll out, scatter sugar, roll up tight, cut 4 cm rounds into buttered tins."],
          ["proof", "proof until risen above the rim.", 80, 25],
          ["bake", "bake, then turn out immediately and roll in more cinnamon sugar.", 25, 190],
        ],
      ],
    ],
    "12 buns",
  );
  return initRepo("morning-bun", r, { linen: "navy", plate: "willow", pastry: "swirl" }, {
    date: day("2026-04-18"),
    tasting: taste(4.5, "caramelised edges, orange comes through. best warm.", "2026-04-18"),
  });
}

function roseHeart(): Repo {
  const r = build(
    "rose",
    "rose & raspberry heart",
    [
      [
        "sablé",
        [
          ["all-purpose flour", 250],
          ["unsalted butter", 150],
          ["powdered sugar", 90],
          ["egg yolk", 36],
          ["salt", 2],
        ],
        [
          ["cream", "rub butter into flour and sugar, bring together with yolks."],
          ["chill", "chill, roll 4 mm, cut hearts.", 60, 4],
          ["bake", "bake until just pale gold.", 12, 165],
        ],
      ],
      [
        "rose icing",
        [
          ["powdered sugar", 150],
          ["rose water", 12, "flavor"],
          ["raspberry purée", 15, "inclusion"],
          ["dried rose petals", 2, "flavor"],
        ],
        [["glaze", "mix to a thick flood. dip hearts, finish with a petal."]],
      ],
    ],
    "20 hearts",
  );
  return initRepo("rose-heart", r, { linen: "blockprint", plate: "butter", pastry: "heart" }, {
    date: day("2026-02-14"),
    tasting: taste(4, "floral without being soapy. raspberry makes the pink.", "2026-02-14"),
  });
}

function painAuChocolat(): Repo {
  const r = build(
    "pac",
    "pain au chocolat",
    [
      [
        "laminated dough",
        [
          ["t45 flour", 500],
          ["water", 140],
          ["whole milk", 140],
          ["sugar", 55],
          ["instant yeast", 7],
          ["fine salt", 10],
          ["unsalted butter", 40],
          ["butter (block)", 280, "fat"],
          ["dark chocolate batons", 90, "inclusion"],
        ],
        [
          ["laminate", "one double, one single fold.", 90, 4],
          ["shape", "cut 8 × 15 cm, two batons each, roll."],
          ["proof", "proof until tripled.", 150, 26],
          ["bake", "egg wash, bake.", 17, 190],
        ],
      ],
    ],
    "14 pains",
  );
  return initRepo("pain-au-chocolat", r, { linen: "terracotta", plate: "fluted", pastry: "pain" }, {
    date: day("2026-03-07"),
    tasting: taste(4, "shattering top, honeycomb crumb.", "2026-03-07"),
  });
}

function almondCroissant(): Repo {
  const r = build(
    "alm",
    "twice-baked almond croissant",
    [
      [
        "day-old croissants",
        [["croissants", 600, "other"]],
        [["cut", "split day-old croissants horizontally."]],
      ],
      [
        "syrup",
        [
          ["water", 150],
          ["sugar", 120],
          ["orange blossom water", 5, "flavor"],
        ],
        [["simmer", "simmer until sugar dissolves. brush generously inside each croissant.", 3]],
      ],
      [
        "frangipane",
        [
          ["unsalted butter", 100],
          ["sugar", 100],
          ["egg", 100],
          ["almond flour", 120],
          ["all-purpose flour", 15],
        ],
        [
          ["cream", "cream butter and sugar, beat in eggs, fold in almond and flour."],
          ["fill", "fill, spread more on top, press on flaked almonds."],
          ["bake", "bake until the tops are toasted.", 18, 180],
        ],
      ],
    ],
    "8 croissants",
  );
  return initRepo("almond-croissant", r, { linen: "ticking", plate: "banded", pastry: "croissant" }, {
    date: day("2026-03-21"),
    tasting: taste(5, "toasted almond, orange blossom in the syrup. the reason for day-old croissants.", "2026-03-21"),
  });
}

function butterCroissant(): Repo {
  const r = build(
    "cro",
    "butter croissant",
    [
      [
        "laminated dough",
        [
          ["t45 flour", 500],
          ["water", 150],
          ["whole milk", 130],
          ["sugar", 55],
          ["instant yeast", 7],
          ["fine salt", 10],
          ["unsalted butter", 40],
          ["butter (block)", 280, "fat"],
        ],
        [
          ["mix", "mix to a firm dough, minimal kneading.", 4],
          ["chill", "chill overnight.", 720, 4],
          ["laminate", "one double, one single fold.", 90, 4],
          ["shape", "cut triangles, roll with a gentle stretch."],
          ["proof", "proof until wobbly.", 150, 26],
          ["bake", "egg wash twice, bake.", 18, 190],
        ],
      ],
    ],
    "12 croissants",
  );
  let repo = initRepo("butter-croissant", r, { linen: "olive", plate: "sky", pastry: "croissant" }, {
    date: day("2026-01-10"),
    tasting: taste(3.5, "butter broke through on the last fold. dough was too warm.", "2026-01-10"),
  });
  repo = {
    ...repo,
    draft: edit(r, (x) => {
      findStep(x, "cro-c0-s2").duration_min = 120;
      findStep(x, "cro-c0-s2").text = "one double, one single fold. 45 min in the freezer between folds, not the fridge.";
    }),
  };
  repo = commit(repo, "freezer rests between folds", {
    date: day("2026-01-24"),
    tasting: taste(4.5, "clean layers, proper honeycomb.", "2026-01-24"),
  });
  return { ...repo, stamp: "tested" };
}

export function seedLibrary(): Library {
  return {
    version: 1,
    repos: [
      cardamomKnots(),
      pistachioCroissant(),
      blueberryDanish(),
      bomboloni(),
      morningBun(),
      roseHeart(),
      painAuChocolat(),
      almondCroissant(),
      butterCroissant(),
    ],
  };
}
