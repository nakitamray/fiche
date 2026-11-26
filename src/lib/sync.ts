import type { SupabaseClient } from "@supabase/supabase-js";
import { Commit, Recipe, Repo, Stamp } from "./ast";
import { embed } from "./flavor";

/**
 * Library <-> Postgres. The tables in supabase/migrations/0001_init.sql are
 * relational (commits, parents, branches); a Repo in the app is one nested
 * object. These functions translate between the two.
 *
 * Commits are content-addressed and never change, so pushing a repo only
 * inserts commits the database hasn't seen. Branches and the repo row
 * (head, draft, stamp) are upserted.
 */

export interface RepositoryRow {
  id?: string;
  owner_id?: string;
  slug: string;
  head: string;
  stamp: string | null;
  draft: Recipe | null;
  created_at: string;
}

export interface CommitRow {
  repository_id: string;
  hash: string;
  branch: string;
  message: string;
  recipe: Recipe;
  crumb_score: number | null;
  tasting_notes: string | null;
  baked_on: string | null;
  committed_at: string;
  flavor: string | null;
}

export interface ParentRow {
  repository_id: string;
  child_hash: string;
  parent_hash: string;
  position: number;
}

export interface BranchRow {
  repository_id: string;
  name: string;
  tip_hash: string;
}

export function repositoryRow(repo: Repo, ownerId?: string): RepositoryRow {
  return {
    ...(ownerId ? { owner_id: ownerId } : {}),
    slug: repo.slug,
    head: repo.head,
    stamp: repo.stamp ?? null,
    draft: repo.draft ?? null,
    created_at: repo.created,
  };
}

export function commitRow(c: Commit, repositoryId: string): CommitRow {
  const { vector } = embed(c.recipe, c.tasting?.notes);
  return {
    repository_id: repositoryId,
    hash: c.hash,
    branch: c.branch,
    message: c.message,
    recipe: c.recipe,
    crumb_score: c.tasting?.crumb_score ?? null,
    tasting_notes: c.tasting?.notes ?? null,
    baked_on: c.tasting?.baked_on ?? null,
    committed_at: c.date,
    flavor: `[${vector.map((v) => v.toFixed(6)).join(",")}]`,
  };
}

export function parentRows(c: Commit, repositoryId: string): ParentRow[] {
  return c.parents.map((p, position) => ({ repository_id: repositoryId, child_hash: c.hash, parent_hash: p, position }));
}

export function branchRows(repo: Repo, repositoryId: string): BranchRow[] {
  return Object.entries(repo.branches).map(([name, tip_hash]) => ({ repository_id: repositoryId, name, tip_hash }));
}

/** rebuild a Repo from its rows; invalid data is dropped rather than crashing the app */
export function repoFromRows(
  r: RepositoryRow,
  commits: CommitRow[],
  parents: ParentRow[],
  branches: BranchRow[],
): Repo | undefined {
  const byChild = new Map<string, ParentRow[]>();
  for (const p of parents) byChild.set(p.child_hash, [...(byChild.get(p.child_hash) ?? []), p]);

  const out: Record<string, Commit> = {};
  for (const row of commits) {
    const parsed = Commit.safeParse({
      hash: row.hash,
      parents: (byChild.get(row.hash) ?? []).sort((a, b) => a.position - b.position).map((p) => p.parent_hash),
      branch: row.branch,
      message: row.message,
      date: new Date(row.committed_at).toISOString(),
      recipe: row.recipe,
      tasting:
        row.crumb_score !== null || row.tasting_notes
          ? {
              crumb_score: Number(row.crumb_score ?? 0),
              notes: row.tasting_notes ?? "",
              ...(row.baked_on ? { baked_on: row.baked_on } : {}),
            }
          : undefined,
    });
    if (parsed.success) out[row.hash] = parsed.data;
  }

  const repo = Repo.safeParse({
    slug: r.slug,
    head: r.head,
    branches: Object.fromEntries(branches.map((b) => [b.name, b.tip_hash])),
    commits: out,
    stamp: r.stamp && Stamp.safeParse(r.stamp).success ? r.stamp : undefined,
    draft: r.draft ?? undefined,
    created: new Date(r.created_at).toISOString(),
  });
  if (!repo.success || !repo.data.branches[repo.data.head]) return undefined;
  return repo.data;
}

export async function pullLibrary(db: SupabaseClient): Promise<Repo[]> {
  const [repos, commits, parents, branches] = await Promise.all([
    db.from("repositories").select("id, slug, head, stamp, draft, created_at").order("created_at", { ascending: false }),
    db.from("commits").select("repository_id, hash, branch, message, recipe, crumb_score, tasting_notes, baked_on, committed_at"),
    db.from("commit_parents").select("repository_id, child_hash, parent_hash, position"),
    db.from("branches").select("repository_id, name, tip_hash"),
  ]);
  for (const r of [repos, commits, parents, branches]) if (r.error) throw r.error;

  const by = <T extends { repository_id: string }>(rows: T[] | null, id: string) =>
    (rows ?? []).filter((x) => x.repository_id === id);

  return (repos.data as RepositoryRow[])
    .map((r) =>
      repoFromRows(
        r,
        by(commits.data as CommitRow[], r.id!),
        by(parents.data as ParentRow[], r.id!),
        by(branches.data as BranchRow[], r.id!),
      ),
    )
    .filter((r): r is Repo => !!r);
}

/**
 * Write one repo. `known` is the set of commit hashes the database already
 * has for it (from the last push or pull), so unchanged history isn't resent.
 * Returns the full set of hashes now stored.
 */
export async function pushRepo(db: SupabaseClient, ownerId: string, repo: Repo, known: Set<string> = new Set()): Promise<Set<string>> {
  const up = await db
    .from("repositories")
    .upsert(repositoryRow(repo, ownerId), { onConflict: "owner_id,slug" })
    .select("id")
    .single();
  if (up.error) throw up.error;
  const id = (up.data as { id: string }).id;

  const fresh = Object.values(repo.commits).filter((c) => !known.has(c.hash));
  if (fresh.length) {
    const ins = await db.from("commits").upsert(fresh.map((c) => commitRow(c, id)), {
      onConflict: "repository_id,hash",
      ignoreDuplicates: true,
    });
    if (ins.error) throw ins.error;
    const ps = fresh.flatMap((c) => parentRows(c, id));
    if (ps.length) {
      const pins = await db.from("commit_parents").upsert(ps, { onConflict: "repository_id,child_hash,position", ignoreDuplicates: true });
      if (pins.error) throw pins.error;
    }
  }

  const bs = await db.from("branches").upsert(branchRows(repo, id), { onConflict: "repository_id,name" });
  if (bs.error) throw bs.error;
  const names = Object.keys(repo.branches);
  const del = await db
    .from("branches")
    .delete()
    .eq("repository_id", id)
    .not("name", "in", `(${names.map((n) => `"${n.replace(/"/g, '""')}"`).join(",")})`);
  if (del.error) throw del.error;

  return new Set(Object.keys(repo.commits));
}

export async function deleteRepo(db: SupabaseClient, slug: string): Promise<void> {
  const { error } = await db.from("repositories").delete().eq("slug", slug);
  if (error) throw error;
}
