"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Linen as LinenT, PastryShape as PastryT, PlateStyle as PlateT, Recipe } from "@/lib/ast";
import { Linen, PastryShape, PlateStyle } from "@/lib/ast";
import { uid } from "@/lib/hash";
import { ingestText } from "@/lib/ingest";
import { initRepo } from "@/lib/repo";
import { uniqueSlug, useLibrary } from "@/lib/store";
import { Plate } from "@/components/Plate";
import { RatioSheet } from "@/components/workbench/RatioSheet";
import { ScaleBox } from "@/components/workbench/SidePanel";

type Mode = "paste" | "link" | "blank";

const EXAMPLE = `Brown Butter Madeleines

Ingredients
1/2 cup (113g) unsalted butter, browned
2 large eggs
1/2 cup granulated sugar
1 tsp vanilla
2/3 cup all-purpose flour
1/2 tsp baking powder
1/4 tsp salt
zest of 1 lemon

Method
Brown the butter until it smells like toffee, then let it cool.
Whisk the eggs and sugar for 5 minutes until pale and thick.
Fold in the flour, baking powder and salt, then the butter.
Chill the batter for at least 1 hour.
Bake at 375°F for 10-12 minutes, until the humps rise.`;

function guessPastry(title: string): PastryT {
  const t = title.toLowerCase();
  if (/croissant/.test(t)) return "croissant";
  if (/pain|chocolat/.test(t)) return "pain";
  if (/bun|roll|swirl|cinnamon/.test(t)) return "swirl";
  if (/knot|babka|twist/.test(t)) return "knot";
  if (/danish|berry/.test(t)) return "danish";
  if (/donut|doughnut|bombolon/.test(t)) return "bomboloni";
  if (/heart|cookie|sabl|shortbread|madeleine/.test(t)) return "heart";
  if (/tart|flan|custard|pie/.test(t)) return "tart";
  return "slab";
}

export default function NewRecipe() {
  const router = useRouter();
  const { library, add } = useLibrary();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [recipe, setRecipe] = useState<Recipe>();
  const [unconverted, setUnconverted] = useState<string[]>([]);
  const [look, setLook] = useState<{ linen: LinenT; plate: PlateT; pastry: PastryT }>({
    linen: "linen",
    plate: "plain",
    pastry: "slab",
  });

  const parse = (raw: string) => {
    const { recipe: r, unconverted: u } = ingestText(raw);
    setRecipe(r);
    setUnconverted(u);
    setLook((l) => ({ ...l, pastry: guessPastry(r.title) }));
  };

  const fetchUrl = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "nothing usable on that page");
      setText(data.text);
      parse(data.text);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!recipe) return;
    const slug = uniqueSlug(recipe.title, library.repos.map((r) => r.slug));
    add(initRepo(slug, recipe, look, { message: "first write-up" }));
    router.push(`/r/${slug}`);
  };

  return (
    <div>
      <section className="mb-6">
        <p className="font-script text-3xl leading-none text-oxblood">from the notebook</p>
        <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">new recipe</h1>
        <p className="mt-2 max-w-xl text-ink/70">
          paste a recipe or a link. cups and spoons become grams, everything gets a baker&apos;s percentage, and it lands as the
          first commit on <span className="font-mono text-[13px]">main</span>.
        </p>
      </section>

      <div className="mb-4 flex gap-1 border-b border-ink/15">
        {(["paste", "link", "blank"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`label -mb-px border-b-2 px-3 py-2 ${mode === m ? "border-oxblood text-oxblood" : "border-transparent text-ink/50 hover:text-ink"}`}
          >
            {m === "paste" ? "paste text" : m === "link" ? "from a link" : "start blank"}
          </button>
        ))}
      </div>

      <div className="paper mb-8 p-4 shadow-card sm:p-5">
        {mode === "paste" && (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder={EXAMPLE}
              className="field font-mono text-[13px] leading-relaxed"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ox" disabled={!text.trim()} onClick={() => parse(text)}>
                read it
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setText(EXAMPLE);
                  parse(EXAMPLE);
                }}
              >
                try the madeleines
              </button>
            </div>
          </>
        )}
        {mode === "link" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchUrl();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="field font-mono text-[13px]" />
            <button className="btn-ox shrink-0" disabled={!url.trim() || busy}>
              {busy ? "reading…" : "fetch"}
            </button>
          </form>
        )}
        {mode === "blank" && (
          <button
            className="btn-ox"
            onClick={() => {
              setRecipe({
                title: "untitled",
                components: [{ id: uid("comp"), name: "dough", ingredients: [{ id: uid("ing"), name: "bread flour", grams: 500, kind: "flour" }], steps: [] }],
              });
              setUnconverted([]);
            }}
          >
            open a blank sheet
          </button>
        )}
        {error && <p className="mt-3 text-oxblood">{error}</p>}
      </div>

      {recipe && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <input
              value={recipe.title}
              onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
              className="mb-4 block w-full bg-transparent font-display text-4xl outline-none focus:bg-parchment/60"
              aria-label="title"
            />
            {unconverted.length > 0 && (
              <div className="mb-4 border-l-2 border-crust bg-butter/20 px-3 py-2 text-[14px]">
                <p className="label mb-1 text-crust">needs a weight</p>
                {unconverted.map((u, i) => (
                  <p key={i}>{u}</p>
                ))}
              </div>
            )}
            <RatioSheet recipe={recipe} edit={(fn) => setRecipe((r) => (r ? fn(r) : r))} readOnly={false} />
          </div>
          <aside className="space-y-4">
            <ScaleBox recipe={recipe} edit={(fn) => setRecipe((r) => (r ? fn(r) : r))} readOnly={false} />
            <section className="paper p-4 shadow-card">
              <div className={`linen linen-${look.linen} relative mb-3 flex aspect-square items-center justify-center`}>
                <Plate plate={look.plate} pastry={look.pastry} className="relative h-[80%] w-[80%]" />
              </div>
              {(
                [
                  ["linen", Linen.options],
                  ["plate", PlateStyle.options],
                  ["pastry", PastryShape.options],
                ] as const
              ).map(([k, opts]) => (
                <label key={k} className="mb-1.5 flex items-center justify-between">
                  <span className="label text-ink/50">{k}</span>
                  <select
                    value={look[k]}
                    onChange={(e) => setLook({ ...look, [k]: e.target.value })}
                    className="label border-b border-ink/20 bg-transparent py-0.5 outline-none"
                  >
                    {opts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ))}
              <button className="btn-ox mt-3 w-full justify-center" onClick={save}>
                commit to main
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
