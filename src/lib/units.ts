import { lookup } from "./density";

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875, "⅕": 0.2,
};

/** cups per unit */
const VOLUME: Record<string, number> = {
  cup: 1,
  tbsp: 1 / 16,
  tsp: 1 / 48,
  floz: 1 / 8,
  ml: 1 / 236.588,
  l: 1000 / 236.588,
  pinch: 1 / 768,
};

/** grams per unit */
const MASS: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/^(cups?|c)$/, "cup"],
  [/^(tablespoons?|tbsps?|tbs|tbl|T)$/, "tbsp"],
  [/^(teaspoons?|tsps?|t)$/, "tsp"],
  [/^(fl\.?\s?oz|fluid\s+ounces?)$/, "floz"],
  [/^(ml|millilit(er|re)s?)$/, "ml"],
  [/^(l|lit(er|re)s?)$/, "l"],
  [/^(g|grams?|gr)$/, "g"],
  [/^(kg|kilograms?|kilos?)$/, "kg"],
  [/^(oz|ounces?)$/, "oz"],
  [/^(lbs?|pounds?)$/, "lb"],
  [/^(pinch(es)?)$/, "pinch"],
  [/^(sticks?)$/, "stick"],
  [/^(large|medium|small|whole|pods?|cloves?)$/, "each"],
];

export function normalizeUnit(raw: string): string | undefined {
  // case matters for T vs t only
  for (const [re, unit] of UNIT_ALIASES) {
    if (re.test(raw)) return unit;
    if (raw !== "T" && raw !== "t" && re.test(raw.toLowerCase())) return unit;
  }
  return undefined;
}

/** "1 1/2", "1½", "3/4", "2-3", "0.5" → number (ranges take the midpoint) */
export function parseQuantity(raw: string): number | undefined {
  let s = raw.trim();
  for (const [ch, v] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(new RegExp(`(\\d)?\\s*${ch}`), (_, whole) => ` ${Number(whole ?? 0) + v}`);
  }
  s = s.trim();
  const range = s.match(/^([\d.\s/]+)\s*(?:-|–|to)\s*([\d.\s/]+)$/);
  if (range) {
    const a = parseQuantity(range[1]);
    const b = parseQuantity(range[2]);
    if (a !== undefined && b !== undefined) return (a + b) / 2;
  }
  let total = 0;
  let any = false;
  for (const part of s.split(/\s+/)) {
    if (!part) continue;
    const frac = part.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      total += Number(frac[1]) / Number(frac[2]);
      any = true;
    } else if (/^\d*\.?\d+$/.test(part)) {
      total += Number(part);
      any = true;
    } else {
      return undefined;
    }
  }
  return any ? total : undefined;
}

/**
 * Convert an amount of something into grams.
 * Returns undefined when we can't do it honestly (unknown density for a
 * volume measure) — the caller should flag the line instead of guessing.
 */
export function toGrams(qty: number, unit: string | undefined, name: string): number | undefined {
  if (unit && unit in MASS) return qty * MASS[unit];
  const entry = lookup(name);
  if (unit === "stick") return qty * (entry?.each ?? 113);
  if (!unit || unit === "each") {
    if (entry?.each) return qty * entry.each;
    return undefined;
  }
  if (unit in VOLUME) {
    if (!entry) {
      // treat unknown liquids as water-ish only for ml/l, which are explicit
      if (unit === "ml" || unit === "l") return qty * VOLUME[unit] * 236.588;
      return undefined;
    }
    return qty * VOLUME[unit] * entry.gPerCup;
  }
  return undefined;
}

export const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
export const fToC = (f: number) => Math.round(((f - 32) * 5) / 9);

export function round(n: number, places = 0): number {
  const m = 10 ** places;
  return Math.round(n * m) / m;
}
