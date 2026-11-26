"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Recipe, Repo } from "@/lib/ast";
import { longDate, minutes } from "@/lib/format";
import { short } from "@/lib/hash";
import {
  checkout,
  cherryPickComponent,
  commit,
  createBranch,
  deleteBranch,
  headCommit,
  isDirty,
  merge,
  workingTree,
} from "@/lib/repo";
import { useLibrary } from "@/lib/store";
import { Stamp, Tag } from "@/components/Tag";
import { DiffView, type Ref } from "@/components/workbench/DiffView";
import { LineageRail } from "@/components/workbench/LineageRail";
import { RatioSheet } from "@/components/workbench/RatioSheet";
import { BranchBox, CommitBox, GraftBox, ScaleBox, StampBox } from "@/components/workbench/SidePanel";

type Tab = "sheet" | "diff";

export function Workbench({ slug }: { slug: string }) {
  const { repo: get, update, remove, library, ready } = useLibrary();
  const repo = get(slug);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sheet");
  const [viewing, setViewing] = useState<string | undefined>();
  const [from, setFrom] = useState<Ref>("branch:main");
  const [to, setTo] = useState<Ref>("working");
  const [showSame, setShowSame] = useState(false);
  const [toast, setToast] = useState<string>();

  if (!repo) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="font-display text-3xl">{ready ? "not in the case" : "…"}</p>
        {ready && (
          <Link href="/" className="label mt-3 inline-block text-glaze underline">
            back to the vitrine
          </Link>
        )}
      </div>
    );
  }

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(undefined), 2600);
  };
  const run = (fn: (r: Repo) => Repo, msg?: string) => {
    try {
      update(slug, fn);
      if (msg) say(msg);
    } catch (e) {
      say((e as Error).message);
    }
  };

  const dirty = isDirty(repo);
  const viewed = viewing ? repo.commits[viewing] : undefined;
  const recipe: Recipe = viewed ? viewed.recipe : workingTree(repo);
  const readOnly = !!viewed;
  const head = headCommit(repo);

  const edit = (fn: (r: Recipe) => Recipe) => {
    if (readOnly) return;
    update(slug, (r) => ({ ...r, draft: fn(workingTree(r)) }));
  };

  return (
    <div>
      {/* header */}
      <section className="mb-6 flex flex-wrap items-end gap-5">
        <div className="min-w-0 flex-1">
          <Link href="/" className="label text-ink/45 hover:text-glaze">
            ← the counter
          </Link>
          {readOnly ? (
            <h1 className="font-display text-5xl leading-[0.95] sm:text-6xl">{recipe.title}</h1>
          ) : (
            <input
              value={recipe.title}
              onChange={(e) => edit((r) => ({ ...r, title: e.target.value }))}
              className="block w-full bg-transparent font-display text-5xl leading-[0.95] outline-none focus:bg-card/60 sm:text-6xl"
              aria-label="title"
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tag tone="glaze">{repo.head}</Tag>
            <Tag>{short(head.hash)}</Tag>
            {recipe.yield && <Tag>{recipe.yield}</Tag>}
            {dirty && <Tag tone="bottle">uncommitted</Tag>}
            <span className="label text-ink/45">
              {recipe.components.length} components · {minutes(recipe.components.flatMap((c) => c.steps).reduce((n, s) => n + (s.duration_min ?? 0), 0))} start to finish
            </span>
          </div>
        </div>
        {repo.stamp && <Stamp kind={repo.stamp} className="h-24 w-24 shrink-0" />}
      </section>

      {viewed && (
        <div className="mb-5 flex flex-wrap items-center gap-3 border border-glaze/30 bg-glaze/5 px-4 py-2.5">
          <span className="label text-glaze">viewing {short(viewed.hash)}</span>
          <span className="text-[15px] italic">“{viewed.message}” — {longDate(viewed.date)}</span>
          {viewed.tasting && (
            <span className="text-[14px] text-ink/70">
              <span className="font-script text-lg text-glaze">notes</span> {viewed.tasting.notes} ({viewed.tasting.crumb_score}/5)
            </span>
          )}
          <span className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setFrom(viewed.hash);
                setTo("working");
                setTab("diff");
                setViewing(undefined);
              }}
              className="btn-ghost"
            >
              diff vs working
            </button>
            <button
              onClick={() => {
                const name = window.prompt("new branch from this bake:", `from-${short(viewed.hash)}`);
                if (name) {
                  run((r) => createBranch({ ...r, draft: undefined }, name, viewed.hash), `forked ${name}`);
                  setViewing(undefined);
                }
              }}
              className="btn-ghost"
            >
              fork here
            </button>
            <button onClick={() => setViewing(undefined)} className="btn-glaze">
              back to {repo.head}
            </button>
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)_300px]">
        {/* lineage */}
        <aside className="order-2 lg:order-1">
          <p className="label mb-2 text-ink/45">lineage</p>
          <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
            <LineageRail repo={repo} dirty={dirty} selected={viewing} onSelect={(h) => setViewing(h === viewing ? undefined : h)} />
          </div>
        </aside>

        {/* centre sheet */}
        <div className="order-1 min-w-0 lg:order-2">
          <div className="mb-4 flex gap-1 border-b border-ink/15">
            {(["sheet", "diff"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`label -mb-px border-b-2 px-3 py-2 ${tab === t ? "border-glaze text-glaze" : "border-transparent text-ink/50 hover:text-ink"}`}
              >
                {t === "sheet" ? "recipe" : "diff"}
              </button>
            ))}
          </div>
          {tab === "sheet" ? (
            <RatioSheet recipe={recipe} edit={edit} readOnly={readOnly} />
          ) : (
            <DiffView repo={repo} from={from} to={to} setFrom={setFrom} setTo={setTo} showSame={showSame} setShowSame={setShowSame} />
          )}
        </div>

        {/* controls */}
        <aside className="order-3 space-y-4">
          <ScaleBox recipe={recipe} edit={edit} readOnly={readOnly} />
          {!readOnly && (
            <CommitBox
              repo={repo}
              dirty={dirty}
              onCommit={(msg, tasting) =>
                run(
                  (r) =>
                    commit(r, msg || (isDirty(r) ? "tweaks" : "rebake"), {
                      tasting: tasting && { ...tasting, baked_on: new Date().toISOString().slice(0, 10) },
                    }),
                  "committed",
                )
              }
              onDiscard={() => run((r) => ({ ...r, draft: undefined }), "changes discarded")}
            />
          )}
          <BranchBox
            repo={repo}
            dirty={dirty}
            onBranch={(name) => run((r) => createBranch(r, name), `now on ${name}`)}
            onCheckout={(b) => {
              if (dirty && !window.confirm("you have uncommitted changes. switch anyway?")) return;
              setViewing(undefined);
              run((r) => checkout(r, b), `now on ${b}`);
            }}
            onMerge={(b) => run((r) => merge(r, b), `merged ${b}`)}
            onDelete={(b) => window.confirm(`delete branch ${b}?`) && run((r) => deleteBranch(r, b), `deleted ${b}`)}
          />
          {!readOnly && (
            <GraftBox
              repo={repo}
              library={library.repos}
              onGraft={(src, hash, comp) => {
                const source = library.repos.find((r) => r.slug === src);
                if (source) run((r) => cherryPickComponent(r, source, hash, comp), "grafted");
              }}
            />
          )}
          <StampBox
            repo={repo}
            onStamp={(stamp) => update(slug, (r) => ({ ...r, stamp }))}
            onDelete={() => {
              remove(slug);
              router.push("/");
            }}
          />
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ y: 40, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: -1 }} exit={{ y: 40, opacity: 0 }}>
              <Tag tone="glaze" className="px-4 py-2 text-[12px]">
                {toast}
              </Tag>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
