import type { IngredientKind } from "./ast";

/**
 * Grams per US cup, water fraction, and kind for things that show up in
 * pastry recipes. Values come from weighing (mostly King Arthur's chart,
 * cross-checked against my own scale for the flours and sugars).
 *
 * Order matters: more specific names must come before generic ones, since
 * lookup returns the first entry whose pattern matches.
 */
export interface DensityEntry {
  match: RegExp;
  gPerCup: number;
  water: number;
  kind: IngredientKind;
  /** weight of one "each" — an egg, a stick of butter, a vanilla pod */
  each?: number;
  label: string;
}

export const DENSITY: DensityEntry[] = [
  { label: "plant milk", match: /\b(almond|oat|soy|coconut|rice)\s+milk\b/, gPerCup: 240, water: 0.9, kind: "liquid" },
  { label: "bread flour", match: /\b(bread|strong|high[- ]protein)\s+flour\b/, gPerCup: 127, water: 0, kind: "flour" },
  { label: "whole wheat flour", match: /\b(whole[- ]wheat|wholemeal)\s+flour\b/, gPerCup: 113, water: 0, kind: "flour" },
  { label: "rye flour", match: /\brye\s+flour\b/, gPerCup: 106, water: 0, kind: "flour" },
  { label: "cake flour", match: /\b(cake|pastry)\s+flour\b/, gPerCup: 113, water: 0, kind: "flour" },
  { label: "almond flour", match: /\b(almond\s+(flour|meal)|ground\s+almonds?)\b/, gPerCup: 96, water: 0, kind: "inclusion" },
  { label: "all-purpose flour", match: /\b(all[- ]purpose|plain|ap|t55|t45|00)?\s*flour\b/, gPerCup: 120, water: 0, kind: "flour" },

  { label: "brown butter", match: /\bbrown(ed)?\s+butter\b/, gPerCup: 190, water: 0, kind: "fat", each: 113 },
  { label: "butter", match: /\bbutter\b/, gPerCup: 227, water: 0.16, kind: "fat", each: 113 },
  { label: "oil", match: /\b(oil)\b/, gPerCup: 198, water: 0, kind: "fat" },

  { label: "egg yolk", match: /\b(egg\s+)?yolks?\b/, gPerCup: 243, water: 0.5, kind: "egg", each: 18 },
  { label: "egg white", match: /\b(egg\s+)?whites?\b/, gPerCup: 243, water: 0.88, kind: "egg", each: 32 },
  { label: "egg", match: /\beggs?\b/, gPerCup: 243, water: 0.75, kind: "egg", each: 50 },

  { label: "heavy cream", match: /\b(heavy|double|whipping)\s+cream\b/, gPerCup: 232, water: 0.58, kind: "dairy" },
  { label: "buttermilk", match: /\bbuttermilk\b/, gPerCup: 242, water: 0.9, kind: "dairy" },
  { label: "sour cream", match: /\b(sour\s+cream|creme\s+fraiche|crème\s+fraîche)\b/, gPerCup: 227, water: 0.72, kind: "dairy" },
  { label: "yogurt", match: /\b(yogh?urt)\b/, gPerCup: 227, water: 0.85, kind: "dairy" },
  { label: "cream cheese", match: /\bcream\s+cheese\b/, gPerCup: 227, water: 0.55, kind: "dairy" },
  { label: "milk", match: /\b(whole\s+|oat\s+|soy\s+)?milk\b/, gPerCup: 242, water: 0.87, kind: "liquid" },
  { label: "water", match: /\bwater\b/, gPerCup: 236, water: 1, kind: "liquid" },

  { label: "brown sugar", match: /\b(light\s+|dark\s+)?brown\s+sugar\b/, gPerCup: 213, water: 0.02, kind: "sugar" },
  { label: "powdered sugar", match: /\b(powdered|icing|confectioners'?)\s+sugar\b/, gPerCup: 113, water: 0, kind: "sugar" },
  { label: "honey", match: /\bhoney\b/, gPerCup: 336, water: 0.17, kind: "sugar" },
  { label: "maple syrup", match: /\bmaple\s+syrup\b/, gPerCup: 312, water: 0.32, kind: "sugar" },
  { label: "sugar", match: /\b(granulated\s+|caster\s+|white\s+)?sugar\b/, gPerCup: 198, water: 0, kind: "sugar" },

  { label: "salt", match: /\b(kosher\s+|sea\s+|fine\s+)?salt\b/, gPerCup: 288, water: 0, kind: "salt" },
  { label: "instant yeast", match: /\b(instant|active\s+dry|dry)\s+yeast\b|\byeast\b/, gPerCup: 152, water: 0, kind: "leavening" },
  { label: "baking powder", match: /\bbaking\s+powder\b/, gPerCup: 192, water: 0, kind: "leavening" },
  { label: "baking soda", match: /\b(baking\s+soda|bicarbonate)\b/, gPerCup: 288, water: 0, kind: "leavening" },
  { label: "levain", match: /\b(levain|sourdough\s+starter|starter)\b/, gPerCup: 227, water: 0.5, kind: "leavening" },

  { label: "cocoa powder", match: /\bcocoa(\s+powder)?\b/, gPerCup: 84, water: 0, kind: "flavor" },
  { label: "chocolate", match: /\bchocolate\b/, gPerCup: 170, water: 0, kind: "inclusion" },
  { label: "pistachios", match: /\bpistachios?\b/, gPerCup: 123, water: 0, kind: "inclusion" },
  { label: "almonds", match: /\balmonds?\b/, gPerCup: 92, water: 0, kind: "inclusion" },
  { label: "berries", match: /\b(blueberr|raspberr|strawberr|blackberr)\w*/, gPerCup: 148, water: 0.85, kind: "inclusion" },
  { label: "cornstarch", match: /\b(corn\s*starch|cornflour)\b/, gPerCup: 112, water: 0, kind: "other" },
  { label: "vanilla", match: /\bvanilla\b/, gPerCup: 208, water: 0.5, kind: "flavor", each: 4 },
  { label: "spice", match: /\b(cardamom|cinnamon|nutmeg|ginger|clove|allspice|zest)\b/, gPerCup: 100, water: 0, kind: "flavor" },
];

export function lookup(name: string): DensityEntry | undefined {
  const n = name.toLowerCase();
  return DENSITY.find((d) => d.match.test(n));
}

export function waterFraction(name: string, kind: IngredientKind): number {
  const hit = lookup(name);
  if (hit) return hit.water;
  if (kind === "liquid") return 1;
  if (kind === "dairy") return 0.8;
  if (kind === "egg") return 0.75;
  return 0;
}

export function guessKind(name: string): IngredientKind {
  return lookup(name)?.kind ?? "other";
}
