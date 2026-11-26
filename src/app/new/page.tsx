"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Recipe } from "@/lib/ast";
import { uid } from "@/lib/hash";
import { ingestText } from "@/lib/ingest";
import { initRepo } from "@/lib/repo";
import { uniqueSlug, useLibrary } from "@/lib/store";
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

  const parse = (raw: string) => {
    const { recipe: r, unconverted: u } = ingestText(raw);
    setRecipe(r);
    setUnconverted(u);
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
    add(initRepo(slug, recipe, { message: "first write-up" }));
    router.push(`/r/${slug}`);
  };

  return (
    <div>
      <section className="mb-6">
        <p className="font-script text-3xl leading-none text-glaze">from the notebook</p>
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
            className={`label -mb-px border-b-2 px-3 py-2 ${mode === m ? "border-glaze text-glaze" : "border-transparent text-ink/50 hover:text-ink"}`}
          >
            {m === "paste" ? "paste text" : m === "link" ? "from a link" : "start blank"}
          </button>
        ))}
      </div>

      <div className="card mb-8 p-4 sm:p-5">
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
              <button className="btn-glaze" disabled={!text.trim()} onClick={() => parse(text)}>
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
            <button className="btn-glaze shrink-0" disabled={!url.trim() || busy}>
              {busy ? "reading…" : "fetch"}
            </button>
          </form>
        )}
        {mode === "blank" && (
          <button
            className="btn-glaze"
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
        {error && <p className="mt-3 text-glaze">{error}</p>}
      </div>

      {recipe && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <input
              value={recipe.title}
              onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
              className="mb-4 block w-full bg-transparent font-display text-4xl outline-none focus:bg-card/60"
              aria-label="title"
            />
            {unconverted.length > 0 && (
              <div className="mb-4 border-l-2 border-honey bg-honey/20 px-3 py-2 text-[14px]">
                <p className="label mb-1 text-honey">needs a weight</p>
                {unconverted.map((u, i) => (
                  <p key={i}>{u}</p>
                ))}
              </div>
            )}
            <RatioSheet recipe={recipe} edit={(fn) => setRecipe((r) => (r ? fn(r) : r))} readOnly={false} />
          </div>
          <aside className="space-y-4">
            <ScaleBox recipe={recipe} edit={(fn) => setRecipe((r) => (r ? fn(r) : r))} readOnly={false} />
            <section className="card p-4">
              <p className="font-script text-2xl leading-none text-brass-deep">looks right?</p>
              <p className="mt-1 text-[14px] text-ink/65">
                fix anything flagged, then save it. it lands as the first commit on <span className="font-mono text-[12px]">main</span>.
              </p>
              <button className="btn-glaze mt-3 w-full justify-center" onClick={save}>
                commit to main
              </button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
