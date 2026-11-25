"""Grams per US cup for the ingredients that matter. Kept in step with
src/lib/density.ts — if you change one, change the other."""

import re

DENSITIES: list[tuple[str, float]] = [
    (r"\b(bread|strong|high[- ]protein)\s+flour\b", 127),
    (r"\b(whole[- ]wheat|wholemeal)\s+flour\b", 113),
    (r"\brye\s+flour\b", 106),
    (r"\b(cake|pastry)\s+flour\b", 113),
    (r"\b(almond\s+(flour|meal)|ground\s+almonds?)\b", 96),
    (r"\bflour\b", 120),
    (r"\bbrown(ed)?\s+butter\b", 190),
    (r"\bbutter\b", 227),
    (r"\boil\b", 198),
    (r"\b(heavy|double|whipping)\s+cream\b", 232),
    (r"\bmilk\b", 242),
    (r"\bwater\b", 236),
    (r"\bbrown\s+sugar\b", 213),
    (r"\b(powdered|icing|confectioners'?)\s+sugar\b", 113),
    (r"\bhoney\b", 336),
    (r"\bsugar\b", 198),
    (r"\bsalt\b", 288),
    (r"\byeast\b", 152),
    (r"\bbaking\s+powder\b", 192),
    (r"\bcocoa\b", 84),
]


def grams_per_cup(name: str) -> float | None:
    n = name.lower()
    for pattern, g in DENSITIES:
        if re.search(pattern, n):
            return g
    return None
