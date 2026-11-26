import { describe, expect, it } from "vitest";
import { seedLibrary } from "@/lib/seed";
import { branchRows, commitRow, parentRows, repoFromRows, repositoryRow, type CommitRow } from "@/lib/sync";

describe("sync rows", () => {
  it("round-trips every seed repo through the table shapes", () => {
    for (const repo of seedLibrary().repos) {
      const id = `id-${repo.slug}`;
      const commits = Object.values(repo.commits);
      // jsonb drops undefined keys, timestamps come back in a different format
      const commitRows = JSON.parse(JSON.stringify(commits.map((c) => commitRow(c, id)))) as CommitRow[];
      for (const r of commitRows) r.committed_at = r.committed_at.replace("Z", "+00:00");
      const back = repoFromRows(
        { ...JSON.parse(JSON.stringify(repositoryRow(repo))), id },
        commitRows,
        commits.flatMap((c) => parentRows(c, id)).reverse(),
        branchRows(repo, id),
      );
      expect(back).toEqual(JSON.parse(JSON.stringify(repo)));
    }
  });

  it("stores a 12-dim flavor vector per commit", () => {
    const repo = seedLibrary().repos[0];
    const row = commitRow(Object.values(repo.commits)[0], "x");
    expect(row.flavor!.slice(1, -1).split(",")).toHaveLength(12);
  });

  it("drops a repo whose head branch is missing", () => {
    const repo = seedLibrary().repos[1];
    const bad = repoFromRows({ ...repositoryRow(repo), head: "nope", id: "x" }, [], [], []);
    expect(bad).toBeUndefined();
  });
});
