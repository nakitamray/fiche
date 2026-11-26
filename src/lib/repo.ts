import type { Commit, Component, Recipe, Repo, TastingLog } from "./ast";
import { hashOf, stableStringify, uid } from "./hash";

/**
 * Git, but for buns. Every function here is pure: it takes a repo and
 * returns a new one. The store decides what to keep.
 */

export const DEFAULT_BRANCH = "main";

export function headCommit(repo: Repo): Commit {
  const hash = repo.branches[repo.head];
  const c = repo.commits[hash];
  if (!c) throw new Error(`branch ${repo.head} points at missing commit ${hash}`);
  return c;
}

export function tipOf(repo: Repo, branch: string): Commit | undefined {
  const h = repo.branches[branch];
  return h ? repo.commits[h] : undefined;
}

/** the recipe you're looking at: the draft if there is one, otherwise HEAD */
export function workingTree(repo: Repo): Recipe {
  return repo.draft ?? headCommit(repo).recipe;
}

export function isDirty(repo: Repo): boolean {
  return !!repo.draft && stableStringify(repo.draft) !== stableStringify(headCommit(repo).recipe);
}

export function makeCommit(input: Omit<Commit, "hash">): Commit {
  return { ...input, hash: hashOf(input) };
}

export function initRepo(
  slug: string,
  recipe: Recipe,
  opts: { date?: string; message?: string; tasting?: TastingLog } = {},
): Repo {
  const date = opts.date ?? new Date().toISOString();
  const root = makeCommit({
    parents: [],
    branch: DEFAULT_BRANCH,
    message: opts.message ?? "first write-up",
    date,
    recipe,
    tasting: opts.tasting,
  });
  return {
    slug,
    head: DEFAULT_BRANCH,
    branches: { [DEFAULT_BRANCH]: root.hash },
    commits: { [root.hash]: root },
    created: date,
  };
}

export function commit(
  repo: Repo,
  message: string,
  opts: { tasting?: TastingLog; date?: string; recipe?: Recipe } = {},
): Repo {
  const parent = headCommit(repo);
  const recipe = opts.recipe ?? repo.draft ?? parent.recipe;
  const c = makeCommit({
    parents: [parent.hash],
    branch: repo.head,
    message: message.trim() || "untitled bake",
    date: opts.date ?? new Date().toISOString(),
    recipe,
    tasting: opts.tasting,
  });
  return {
    ...repo,
    commits: { ...repo.commits, [c.hash]: c },
    branches: { ...repo.branches, [repo.head]: c.hash },
    draft: undefined,
  };
}

export function branchName(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** fork from the current HEAD (carrying any draft along) and check it out */
export function createBranch(repo: Repo, raw: string, from?: string): Repo {
  const name = branchName(raw);
  if (!name) throw new Error("branch needs a name");
  if (repo.branches[name]) throw new Error(`branch "${name}" already exists`);
  const at = from ?? repo.branches[repo.head];
  return { ...repo, branches: { ...repo.branches, [name]: at }, head: name };
}

export function checkout(repo: Repo, branch: string): Repo {
  if (!repo.branches[branch]) throw new Error(`no branch "${branch}"`);
  return { ...repo, head: branch, draft: undefined };
}

export function deleteBranch(repo: Repo, branch: string): Repo {
  if (branch === DEFAULT_BRANCH) throw new Error("can't delete main");
  const branches = { ...repo.branches };
  delete branches[branch];
  return { ...repo, branches, head: repo.head === branch ? DEFAULT_BRANCH : repo.head };
}

/** walk first parents back from a commit */
export function history(repo: Repo, from: string): Commit[] {
  const out: Commit[] = [];
  const seen = new Set<string>();
  let cur: Commit | undefined = repo.commits[from];
  while (cur && !seen.has(cur.hash)) {
    out.push(cur);
    seen.add(cur.hash);
    cur = cur.parents[0] ? repo.commits[cur.parents[0]] : undefined;
  }
  return out;
}

export function isAncestor(repo: Repo, maybe: string, of: string): boolean {
  const stack = [of];
  const seen = new Set<string>();
  while (stack.length) {
    const h = stack.pop()!;
    if (h === maybe) return true;
    if (seen.has(h)) continue;
    seen.add(h);
    stack.push(...(repo.commits[h]?.parents ?? []));
  }
  return false;
}

/**
 * Merge `branch` into HEAD. Fast-forwards when it can; otherwise takes the
 * other branch's recipe wholesale as a two-parent commit. Recipe merges are
 * a judgment call, so the real decision happens in the diff view before you
 * press the button.
 */
export function merge(repo: Repo, branch: string, message?: string): Repo {
  const theirs = repo.branches[branch];
  const ours = repo.branches[repo.head];
  if (!theirs) throw new Error(`no branch "${branch}"`);
  if (isAncestor(repo, theirs, ours)) return repo;
  if (isAncestor(repo, ours, theirs)) {
    return { ...repo, branches: { ...repo.branches, [repo.head]: theirs }, draft: undefined };
  }
  const c = makeCommit({
    parents: [ours, theirs],
    branch: repo.head,
    message: message ?? `merge ${branch} into ${repo.head}`,
    date: new Date().toISOString(),
    recipe: repo.commits[theirs].recipe,
    tasting: repo.commits[theirs].tasting,
  });
  return {
    ...repo,
    commits: { ...repo.commits, [c.hash]: c },
    branches: { ...repo.branches, [repo.head]: c.hash },
    draft: undefined,
  };
}

/** fresh ids all the way down so a grafted component never collides */
export function reidComponent(c: Component): Component {
  return {
    ...c,
    id: uid("comp"),
    ingredients: c.ingredients.map((i) => ({ ...i, id: uid("ing") })),
    steps: c.steps.map((s) => ({ ...s, id: uid("step") })),
  };
}

/**
 * Lift one component (a pastry cream, a glaze) out of any commit in any repo
 * and drop it into this repo's working tree.
 */
export function cherryPickComponent(target: Repo, source: Repo, commitHash: string, componentId: string): Repo {
  const src = source.commits[commitHash]?.recipe.components.find((c) => c.id === componentId);
  if (!src) throw new Error("component not found");
  const tree = workingTree(target);
  const grafted: Component = {
    ...reidComponent(src),
    origin: { repo: source.slug, commit: commitHash, component: componentId },
  };
  return { ...target, draft: { ...tree, components: [...tree.components, grafted] } };
}

/** most recent tasting note anywhere on a branch's history */
export function lastTasting(repo: Repo, branch = repo.head): { tasting: TastingLog; date: string } | undefined {
  const tip = repo.branches[branch];
  if (!tip) return undefined;
  for (const c of history(repo, tip)) if (c.tasting) return { tasting: c.tasting, date: c.tasting.baked_on ?? c.date };
  return undefined;
}

export interface LaidOutCommit {
  commit: Commit;
  row: number;
  lane: number;
  branches: string[];
}

/**
 * Lay the DAG out for the lineage rail: newest at the top, one lane per
 * branch, main always in lane 0.
 */
export function layout(repo: Repo): { nodes: LaidOutCommit[]; lanes: string[] } {
  const all = Object.values(repo.commits).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const lanes = [DEFAULT_BRANCH, ...Object.keys(repo.branches).filter((b) => b !== DEFAULT_BRANCH).sort()];
  // a commit's lane is the branch it was made on, unless that branch is gone
  const laneOf = (c: Commit) => {
    const i = lanes.indexOf(c.branch);
    return i === -1 ? 0 : i;
  };
  const tips: Record<string, string[]> = {};
  for (const [b, h] of Object.entries(repo.branches)) (tips[h] ??= []).push(b);
  return {
    lanes,
    nodes: all.map((c, row) => ({ commit: c, row, lane: laneOf(c), branches: tips[c.hash] ?? [] })),
  };
}
