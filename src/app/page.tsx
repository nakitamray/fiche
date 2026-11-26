"use client";

import Link from "next/link";
import { CafeScene, MIRRORS, SceneSlot } from "@/components/CafeScene";
import { Letterboard, MenuBoard, MenuMirror, MenuWall, type MenuItem } from "@/components/Counter";
import { ratios } from "@/lib/math";
import { DEFAULT_BRANCH, lastTasting, workingTree } from "@/lib/repo";
import { useLibrary } from "@/lib/store";

export default function TheCounter() {
  const { library } = useLibrary();
  const repos = library.repos;

  const today: MenuItem[] = repos.slice(0, 8).map((r) => ({
    href: `/r/${r.slug}`,
    label: workingTree(r).title,
    value: (() => {
      const x = ratios(workingTree(r));
      return x.flour_g >= 100 && x.hydration_pct <= 150 ? `${x.hydration_pct}%` : "—";
    })(),
  }));
  const trials: MenuItem[] = repos
    .flatMap((r) =>
      Object.keys(r.branches)
        .filter((b) => b !== DEFAULT_BRANCH)
        .map((b) => ({
          href: `/r/${r.slug}`,
          label: b.replace(/-/g, " "),
          value: `${ratios(r.commits[r.branches[b]].recipe).hydration_pct}%`,
        })),
    )
    .slice(0, 7);

  const scores = repos.map((r) => lastTasting(r)?.tasting.crumb_score).filter((s): s is number => !!s);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
  const bakes = repos.reduce((n, r) => n + Object.keys(r.commits).length, 0);
  const branches = repos.reduce((n, r) => n + Object.keys(r.branches).length, 0);

  return (
    <div className="space-y-16">
      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-script text-[34px] leading-none text-glaze">bonjour, come in</p>
            <h1 className="font-display text-[56px] leading-[0.9] text-ink sm:text-[72px]">the counter</h1>
          </div>
          <Link href="/new" className="btn-glaze">
            write a new recipe
          </Link>
        </div>

        <CafeScene>
          <div className="hidden md:block">
            <SceneSlot {...MIRRORS[0]}>
              <MenuMirror fluid title="today" items={today} empty="nothing yet" />
            </SceneSlot>
            <SceneSlot {...MIRRORS[1]}>
              <MenuMirror fluid title="on trial" items={trials} empty="no experiments" />
            </SceneSlot>
          </div>
        </CafeScene>

        {/* on small screens the mirrors come off the wall */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 md:hidden">
          <MenuMirror title="today" items={today} empty="nothing yet" />
          <MenuMirror title="on trial" items={trials} empty="no experiments" />
        </div>
      </section>

      <section>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-script text-3xl leading-none text-brass-deep">in the case</p>
            <h2 className="font-display text-5xl leading-[0.95]">every recipe</h2>
          </div>
          <p className="max-w-sm text-[15px] text-ink/65">
            each board shows the tip of whatever branch the recipe is on. open one to edit, fork an experiment, or compare bakes.
          </p>
        </div>

        {repos.length ? (
          <MenuWall>
            <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {repos.map((repo, i) => (
                <MenuBoard key={repo.slug} repo={repo} index={i} />
              ))}
            </div>
          </MenuWall>
        ) : (
          <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-display text-4xl">the case is empty</p>
            <p className="max-w-sm text-ink/70">paste a recipe or a link and it&apos;ll show up here as its first commit on main.</p>
            <Link href="/new" className="btn-glaze mt-2">
              start one
            </Link>
          </div>
        )}
      </section>

      <section>
        <Letterboard
          lines={[
            ["recipes", String(repos.length)],
            ["branches", String(branches)],
            ["bakes logged", String(bakes)],
            ["avg crumb", avg],
          ]}
        />
      </section>
    </div>
  );
}
