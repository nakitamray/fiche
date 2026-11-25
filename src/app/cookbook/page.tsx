"use client";

import { useRef, useState } from "react";
import { Library } from "@/lib/ast";
import { longDate, minutes } from "@/lib/format";
import { short } from "@/lib/hash";
import { bakersPct, ratios } from "@/lib/math";
import { DEFAULT_BRANCH, lastTasting, tipOf } from "@/lib/repo";
import { useLibrary } from "@/lib/store";
import { cookbookTypst } from "@/lib/typst";
import { cToF } from "@/lib/units";
import { Plate } from "@/components/Plate";

function download(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Cookbook() {
  const { library, replace, reset } = useLibrary();
  const [skip, setSkip] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("fiche");
  const [author, setAuthor] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [msg, setMsg] = useState<string>();
  const file = useRef<HTMLInputElement>(null);
  const chosen = library.repos.filter((r) => !skip.has(r.slug));

  return (
    <div>
      <section className="no-print mb-6">
        <p className="font-script text-3xl leading-none text-oxblood">the house book</p>
        <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">cookbook</h1>
        <p className="mt-2 max-w-xl text-ink/70">
          takes the tip of <span className="font-mono text-[13px]">main</span> from every recipe you tick and sets it as a little
          a5 book. print it straight from here, or download the typst source for a proper pdf.
        </p>
      </section>

      <div className="no-print mb-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="paper p-4 shadow-card">
          <p className="label mb-2 text-oxblood">in the book</p>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {library.repos.map((r) => {
              const tip = tipOf(r, DEFAULT_BRANCH);
              return (
                <label key={r.slug} className="flex items-center gap-2 text-[15px]">
                  <input
                    type="checkbox"
                    className="accent-oxblood"
                    checked={!skip.has(r.slug)}
                    onChange={() =>
                      setSkip((s) => {
                        const n = new Set(s);
                        if (n.has(r.slug)) n.delete(r.slug);
                        else n.add(r.slug);
                        return n;
                      })
                    }
                  />
                  {tip?.recipe.title}
                  <span className="label ml-auto text-ink/35">{tip && short(tip.hash)}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="paper space-y-2 p-4 shadow-card">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" placeholder="book title" />
          <input value={author} onChange={(e) => setAuthor(e.target.value)} className="field" placeholder="your name (for the cover)" />
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn-ox" onClick={() => window.print()} disabled={!chosen.length}>
              print / pdf
            </button>
            <button
              className="btn-green"
              disabled={!chosen.length || compiling}
              onClick={async () => {
                setCompiling(true);
                setMsg(undefined);
                try {
                  const res = await fetch("/api/compile", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ typst: cookbookTypst(chosen, { title, author }) }),
                  });
                  if (!res.ok) throw new Error(((await res.json()) as { error: string }).error);
                  const url = URL.createObjectURL(await res.blob());
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "cookbook.pdf";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setMsg((e as Error).message);
                } finally {
                  setCompiling(false);
                }
              }}
            >
              {compiling ? "setting type…" : "typeset pdf"}
            </button>
            <button
              className="btn-ghost"
              disabled={!chosen.length}
              onClick={() => download("cookbook.typ", cookbookTypst(chosen, { title, author }), "text/plain")}
            >
              .typ
            </button>
          </div>
          {msg && <p className="text-[14px] text-oxblood">{msg}</p>}
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-ink/10 pt-2">
            <button className="label text-ink/55 hover:text-oxblood" onClick={() => download("fiche-library.json", JSON.stringify(library, null, 2), "application/json")}>
              export library
            </button>
            <button className="label text-ink/55 hover:text-oxblood" onClick={() => file.current?.click()}>
              import library
            </button>
            <button
              className="label text-ink/35 hover:text-oxblood"
              onClick={() => window.confirm("replace everything with the starter recipes?") && reset()}
            >
              reset to starters
            </button>
            <input
              ref={file}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const parsed = Library.safeParse(JSON.parse(await f.text()));
                if (parsed.success) replace(parsed.data);
                else window.alert("that file isn't a fiche library");
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>

      {/* the book */}
      <div className="flex flex-col items-center gap-8">
        <article className="print-page paper flex aspect-[148/210] w-full max-w-[560px] flex-col items-center justify-center p-10 text-center shadow-card">
          <p className="font-script text-4xl text-oxblood">the house book</p>
          <h2 className="font-display text-8xl leading-none text-awning">{title}</h2>
          <div className="my-8 grid grid-cols-3 gap-1">
            {chosen.slice(0, 9).map((r) => (
              <div key={r.slug} className={`linen linen-${r.linen} relative flex h-16 w-16 items-center justify-center`}>
                <Plate plate={r.plate} pastry={r.pastry} size={54} />
              </div>
            ))}
          </div>
          {author && <p className="label tracking-[0.3em] text-ink/60">{author}</p>}
        </article>

        {chosen.map((repo, n) => {
          const tip = tipOf(repo, DEFAULT_BRANCH);
          if (!tip) return null;
          const r = tip.recipe;
          const rt = ratios(r);
          const t = lastTasting(repo, DEFAULT_BRANCH);
          return (
            <article key={repo.slug} className="print-page paper relative w-full max-w-[560px] p-8 shadow-card sm:p-10">
              <span className="label absolute right-6 top-6 text-ink/35">{String(n + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-5xl leading-none text-oxblood">{r.title}</h2>
              <p className="label mt-1 text-ink/40">
                main · {short(tip.hash)} · {longDate(tip.date)}
                {r.yield && ` · ${r.yield}`}
              </p>
              <div className="my-4 flex flex-wrap gap-1.5">
                {[
                  ["flour", `${rt.flour_g} g`],
                  ["hydration", `${rt.hydration_pct}%`],
                  ["fat", `${rt.fat_pct}%`],
                  ["sugar", `${rt.sugar_pct}%`],
                ].map(([k, v]) => (
                  <span key={k} className="label border border-awning/60 px-1.5 py-0.5 text-[10px] text-awning">
                    {k} {v}
                  </span>
                ))}
              </div>
              {r.components.map((c) => (
                <section key={c.id} className="mb-4">
                  <h3 className="label mb-1 border-b border-oxblood/50 pb-0.5 text-[10.5px] text-oxblood">{c.name}</h3>
                  <table className="mb-2 w-full text-[14px]">
                    <tbody>
                      {c.ingredients.map((i) => (
                        <tr key={i.id}>
                          <td className="py-0.5">{i.name}</td>
                          <td className="w-16 py-0.5 text-right font-mono text-[12px]">{i.grams} g</td>
                          <td className="w-14 py-0.5 text-right font-mono text-[11px] text-ink/40">{bakersPct(i, r)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ol className="list-decimal space-y-0.5 pl-5 text-[14px] leading-snug marker:font-mono marker:text-[11px] marker:text-oxblood/60">
                    {c.steps.map((s) => (
                      <li key={s.id}>
                        {s.text}
                        {(s.duration_min !== undefined || s.temp_c !== undefined) && (
                          <span className="ml-1 font-mono text-[10.5px] text-ink/40">
                            {[minutes(s.duration_min), s.temp_c !== undefined ? `${s.temp_c}°C/${cToF(s.temp_c)}°F` : ""].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              {t && (
                <div className="mt-5 border-l-2 border-oxblood pl-3">
                  <p className="font-script text-2xl leading-none text-oxblood">tasting notes</p>
                  <p className="italic">
                    {t.tasting.notes} <span className="not-italic text-ink/50">— {t.tasting.crumb_score}/5</span>
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
