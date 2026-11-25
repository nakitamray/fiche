"use client";

import type { Repo } from "@/lib/ast";
import { short } from "@/lib/hash";
import { shortDate } from "@/lib/format";
import { layout } from "@/lib/repo";

const ROW = 58;
const LANE = 16;
const PAD = 12;
const LANE_COLORS = ["#6b2428", "#3b4d3b", "#b7793a", "#5b78b5", "#8c3a6e", "#6f8a5b"];

export function LineageRail({
  repo,
  selected,
  onSelect,
  dirty,
}: {
  repo: Repo;
  selected?: string;
  onSelect: (hash: string) => void;
  dirty: boolean;
}) {
  const { nodes, lanes } = layout(repo);
  const offset = dirty ? 1 : 0;
  const width = PAD * 2 + LANE * Math.max(1, lanes.length);
  const height = (nodes.length + offset) * ROW;
  const pos = new Map(nodes.map((n) => [n.commit.hash, n]));
  const x = (lane: number) => PAD + lane * LANE;
  const y = (row: number) => (row + offset) * ROW + ROW / 2 - 8;
  const headLane = Math.max(0, lanes.indexOf(repo.head));
  const headHash = repo.branches[repo.head];

  return (
    <div className="relative" style={{ minHeight: height }}>
      <svg width={width} height={height} className="absolute left-0 top-0" aria-hidden>
        <defs>
          <filter id="flour" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
          </filter>
        </defs>
        <g filter="url(#flour)">
          {nodes.flatMap((n) =>
            n.commit.parents.map((p) => {
              const parent = pos.get(p);
              if (!parent) return null;
              const x1 = x(n.lane), y1 = y(n.row), x2 = x(parent.lane), y2 = y(parent.row);
              const color = LANE_COLORS[n.lane % LANE_COLORS.length];
              const d = x1 === x2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} C${x1} ${y1 + ROW * 0.7}, ${x2} ${y2 - ROW * 0.7}, ${x2} ${y2}`;
              return (
                <g key={`${n.commit.hash}-${p}`}>
                  <path d={d} stroke={color} strokeOpacity="0.25" strokeWidth="5" fill="none" strokeLinecap="round" />
                  <path d={d} stroke={color} strokeWidth="1.6" fill="none" strokeDasharray="1 3.5" strokeLinecap="round" />
                </g>
              );
            }),
          )}
          {dirty && headHash && pos.get(headHash) && (
            <path
              d={`M${x(headLane)} ${ROW / 2 - 8} L${x(pos.get(headHash)!.lane)} ${y(pos.get(headHash)!.row)}`}
              stroke="#2a211c"
              strokeOpacity="0.35"
              strokeWidth="1.4"
              strokeDasharray="3 4"
            />
          )}
        </g>
        {dirty && <circle cx={x(headLane)} cy={ROW / 2 - 8} r="5" fill="#faf7f2" stroke="#2a211c" strokeDasharray="2 2" />}
        {nodes.map((n) => {
          const color = LANE_COLORS[n.lane % LANE_COLORS.length];
          const isSel = n.commit.hash === selected;
          return (
            <g key={n.commit.hash}>
              {isSel && <circle cx={x(n.lane)} cy={y(n.row)} r="10" fill={color} opacity="0.15" />}
              <circle
                cx={x(n.lane)}
                cy={y(n.row)}
                r={n.commit.parents.length > 1 ? 6.5 : 5.5}
                fill={n.commit.tasting ? color : "#faf7f2"}
                stroke={color}
                strokeWidth="1.8"
              />
            </g>
          );
        })}
      </svg>

      <ol className="relative">
        {dirty && (
          <li style={{ height: ROW, paddingLeft: width }} className="pr-1">
            <p className="label text-ink/50">working tree</p>
            <p className="text-[14px] italic text-ink/60">uncommitted changes</p>
          </li>
        )}
        {nodes.map((n) => {
          const isSel = n.commit.hash === selected;
          return (
            <li key={n.commit.hash} style={{ height: ROW, paddingLeft: width }}>
              <button
                onClick={() => onSelect(n.commit.hash)}
                className={`group block w-full truncate pr-1 text-left ${isSel ? "text-oxblood" : "text-ink hover:text-oxblood"}`}
                title={n.commit.message}
              >
                <span className="label flex items-center gap-1.5 text-ink/45">
                  <span className={isSel ? "text-oxblood" : ""}>{short(n.commit.hash)}</span>
                  <span>·</span>
                  <span>{shortDate(n.commit.date)}</span>
                  {n.commit.tasting && <span className="text-crust">★{n.commit.tasting.crumb_score}</span>}
                </span>
                <span className="block truncate text-[14.5px] leading-snug">{n.commit.message}</span>
                {n.branches.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {n.branches.map((b) => (
                      <span
                        key={b}
                        className={`label border px-1 text-[9.5px] leading-[15px] ${
                          b === repo.head ? "border-oxblood bg-oxblood text-parchment" : "border-ink/25 text-ink/60"
                        }`}
                      >
                        {b}
                      </span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
