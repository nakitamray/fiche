"use client";

import Link from "next/link";
import { PlateTile } from "@/components/PlateTile";
import { useLibrary } from "@/lib/store";

export default function Vitrine() {
  const { library } = useLibrary();
  const repos = library.repos;
  const branches = repos.reduce((n, r) => n + Object.keys(r.branches).length, 0);
  const commits = repos.reduce((n, r) => n + Object.keys(r.commits).length, 0);

  return (
    <div>
      <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-script text-3xl leading-none text-oxblood">today&apos;s case</p>
          <h1 className="font-display text-5xl leading-[0.95] text-ink sm:text-6xl">la vitrine</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="label text-ink/55">
            {repos.length} recipes · {branches} branches · {commits} bakes
          </span>
          <Link href="/new" className="btn-ox">
            + new recipe
          </Link>
        </div>
      </section>

      {repos.length === 0 ? (
        <div className="paper flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="font-display text-3xl">the case is empty</p>
          <p className="max-w-sm text-ink/70">paste a recipe or a link and it&apos;ll show up here as its first commit on main.</p>
          <Link href="/new" className="btn-ox mt-2">
            start one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, i) => (
            <PlateTile key={repo.slug} repo={repo} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
