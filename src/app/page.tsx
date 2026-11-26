"use client";

import Link from "next/link";
import { PriceList, Vitrine, pct, type ListRow } from "@/components/Vitrine";
import { ratios } from "@/lib/math";
import { DEFAULT_BRANCH, lastTasting, workingTree } from "@/lib/repo";
import { useLibrary } from "@/lib/store";

export default function LaVitrine() {
  const { library } = useLibrary();
  const repos = library.repos;

  const trials: ListRow[] = repos.flatMap((r) =>
    Object.keys(r.branches)
      .filter((b) => b !== DEFAULT_BRANCH)
      .map((b) => {
        const x = ratios(r.commits[r.branches[b]].recipe);
        return { href: `/r/${r.slug}`, name: b.replace(/-/g, " "), detail: workingTree(r).title, value: pct(x.hydration_pct, x.flour_g) };
      }),
  );

  const lately: ListRow[] = repos
    .map((r) => ({ r, t: lastTasting(r) }))
    .filter((x) => x.t)
    .sort((a, b) => (a.t!.date < b.t!.date ? 1 : -1))
    .slice(0, 5)
    .map(({ r, t }) => ({
      href: `/r/${r.slug}`,
      name: workingTree(r).title,
      detail: t!.date.slice(0, 10),
      value: `${t!.tasting.crumb_score} / 5`,
    }));

  return (
    <div className="space-y-16">
      <section className="grid items-end gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="label text-oxblood">ouvert tous les jours</p>
          <h1 className="mt-3 font-serif text-[64px] leading-[0.88] tracking-[-0.01em] sm:text-[96px]">
            every recipe,
            <br />
            <span className="italic text-oxblood">every bake.</span>
          </h1>
        </div>
        <div className="slip px-6 py-5">
          <p className="font-serif text-[20px] leading-snug">
            each card in the case is the tip of whatever branch that recipe is on. pick one up to edit it, fork an experiment, or set
            two bakes side by side.
          </p>
          <Link href="/new" className="btn-ox mt-4">
            write a new recipe
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h2 className="font-cond text-[13px] font-bold uppercase tracking-[0.3em]">la vitrine</h2>
          <span className="label text-muted">{repos.length} in the case</span>
        </div>
        {repos.length ? (
          <Vitrine repos={repos} />
        ) : (
          <div className="slip px-6 py-14 text-center">
            <p className="font-serif text-4xl italic">the case is empty</p>
            <p className="mt-2 text-muted">paste a recipe or a link and it lands here as its first commit on main.</p>
            <Link href="/new" className="btn-ox mt-5">
              start one
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <PriceList title="en essai — on trial" rows={trials} empty="no experiments running." />
        <PriceList title="sorti du four — lately" rows={lately} empty="nothing baked yet." />
      </section>
    </div>
  );
}
