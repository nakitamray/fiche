"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Repo } from "@/lib/ast";
import { ratios } from "@/lib/math";
import { plural, shortDate } from "@/lib/format";
import { lastTasting, workingTree } from "@/lib/repo";
import { Plate } from "./Plate";
import { Stamp, Tag } from "./Tag";

const DARK = new Set(["oxblood", "navy", "terracotta"]);

export function PlateTile({ repo, index }: { repo: Repo; index: number }) {
  const recipe = workingTree(repo);
  const r = ratios(recipe);
  const last = lastTasting(repo);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
    >
      <Link href={`/r/${repo.slug}`} className="group block">
        <motion.div
          initial="rest"
          whileHover="hover"
          whileFocus="hover"
          animate="rest"
          className={`linen linen-${repo.linen} relative aspect-square overflow-hidden`}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            variants={{ rest: { scale: 1, rotate: 0 }, hover: { scale: 1.035, rotate: -2 } }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <Plate plate={repo.plate} pastry={repo.pastry} className="h-[78%] w-[78%]" />
          </motion.div>

          {repo.stamp && <Stamp kind={repo.stamp} light={DARK.has(repo.linen)} className="absolute right-2 top-2 z-10 h-16 w-16 sm:h-20 sm:w-20" />}

          <motion.div
            className="absolute inset-x-3 bottom-3 z-10 flex flex-col items-start gap-1"
            variants={{ rest: { y: "130%", opacity: 0 }, hover: { y: 0, opacity: 1 } }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <Tag tone="ox">{repo.head}</Tag>
            <Tag>
              hydration {r.hydration_pct}% · {last ? `baked ${shortDate(last.date)}` : "not baked yet"}
            </Tag>
          </motion.div>
        </motion.div>
        <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
          <h3 className="font-display text-[22px] leading-tight text-ink group-hover:text-oxblood">{recipe.title}</h3>
          <span className="label shrink-0 text-ink/45">{plural(Object.keys(repo.commits).length, "bake")}</span>
        </div>
      </Link>
    </motion.div>
  );
}
