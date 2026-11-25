import type { Recipe, Repo } from "./ast";
import { bakersPct, ratios } from "./math";
import { lastTasting, tipOf, DEFAULT_BRANCH } from "./repo";
import { short } from "./hash";

/**
 * Cookbook export as Typst source. `typst compile cookbook.typ` (or the
 * worker in /worker) turns it into the PDF. Fonts are referenced by family
 * name, so install the three in /public/fonts or pass --font-path.
 */

const esc = (s: string) => s.replace(/([\\#*_`$@<>\[\]])/g, "\\$1");
const str = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function recipePage(recipe: Recipe, meta: { hash: string; notes?: string; score?: number }): string {
  const r = ratios(recipe);
  const out: string[] = [];
  out.push(`#recipe(`);
  out.push(`  title: ${str(recipe.title)},`);
  out.push(`  hash: ${str(short(meta.hash))},`);
  out.push(
    `  ratios: (("flour", "${r.flour_g} g"), ("hydration", "${r.hydration_pct}%"), ("fat", "${r.fat_pct}%"), ("sugar", "${r.sugar_pct}%")),`,
  );
  out.push(`  notes: ${meta.notes ? str(meta.notes) : "none"},`);
  out.push(`  score: ${meta.score ?? "none"},`);
  out.push(`)[`);
  for (const c of recipe.components) {
    out.push(`  #component(${str(c.name)})`);
    out.push(`  #table(columns: (1fr, auto, auto), stroke: none, inset: (y: 3pt),`);
    for (const i of c.ingredients) {
      out.push(`    [${esc(i.name)}], [${i.grams} g], [#text(fill: muted)[${bakersPct(i, recipe)}%]],`);
    }
    out.push(`  )`);
    if (c.steps.length) {
      out.push(`  #enum(`);
      for (const s of c.steps) out.push(`    [${esc(s.text)}],`);
      out.push(`  )`);
    }
  }
  out.push(`]`);
  return out.join("\n");
}

export function cookbookTypst(repos: Repo[], opts: { title?: string; author?: string } = {}): string {
  const pages = repos
    .map((repo) => {
      const tip = tipOf(repo, DEFAULT_BRANCH);
      if (!tip) return "";
      const t = lastTasting(repo, DEFAULT_BRANCH);
      return recipePage(tip.recipe, { hash: tip.hash, notes: t?.tasting.notes, score: t?.tasting.crumb_score });
    })
    .filter(Boolean);

  return `// fiche — cookbook export
// compile with: typst compile --font-path public/fonts cookbook.typ

#let oxblood = rgb("#6B2428")
#let awning = rgb("#3B4D3B")
#let muted = rgb("#8A7E72")
#let paper = rgb("#FAF7F2")

#set page(paper: "a5", fill: paper, margin: (x: 18mm, y: 20mm),
  footer: context [#set text(font: "Markl Mono", size: 7pt, fill: muted); #h(1fr) #counter(page).display() #h(1fr)])
#set text(font: ("Newsreader", "Georgia"), size: 9.5pt, fill: rgb("#2A211C"))
#set par(leading: 0.62em)

#let component(name) = {
  v(10pt)
  text(font: "Markl Mono", size: 7.5pt, tracking: 1.2pt, fill: oxblood, upper(name))
  v(-4pt)
  line(length: 100%, stroke: 0.4pt + oxblood)
}

#let recipe(title: "", hash: "", ratios: (), notes: none, score: none, body) = {
  pagebreak(weak: true)
  text(font: "Black Goose", size: 30pt, fill: oxblood, lower(title))
  v(-6pt)
  text(font: "Markl Mono", size: 7pt, fill: muted, tracking: 1pt)[#upper("main") · #hash]
  v(6pt)
  grid(columns: ratios.len(), column-gutter: 6pt,
    ..ratios.map(((k, v)) => box(stroke: 0.5pt + awning, inset: 5pt, radius: 1pt,
      text(font: "Markl Mono", size: 7pt, fill: awning)[#upper(k) #v])))
  body
  if notes != none {
    v(12pt)
    block(inset: (left: 8pt), stroke: (left: 1pt + oxblood))[
      #text(font: "Perfecto Calligraphy - Personal use", size: 16pt, fill: oxblood)[tasting notes]
      #linebreak()
      #emph(notes)
      #if score != none [ — #score / 5]
    ]
  }
}

#align(center + horizon)[
  #text(font: "Perfecto Calligraphy - Personal use", size: 22pt, fill: oxblood)[the house book]
  #v(-10pt)
  #text(font: "Black Goose", size: 64pt, fill: awning)[${esc(opts.title ?? "fiche")}]
  #v(4pt)
  #text(font: "Markl Mono", size: 8pt, tracking: 2pt, fill: muted)[${esc((opts.author ?? "").toUpperCase())}]
]

${pages.join("\n\n")}
`;
}
