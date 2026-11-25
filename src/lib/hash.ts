/**
 * Content hash for commits. Not cryptographic — it only has to be stable and
 * spread well enough that two different bakes never collide in one library.
 * Two FNV-1a passes with different seeds, glued into 12 hex chars.
 */
function fnv1a(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function hashOf(value: unknown): string {
  const s = stableStringify(value);
  const a = fnv1a(s, 0x811c9dc5).toString(16).padStart(8, "0");
  const b = fnv1a(s, 0x050c5d1f).toString(16).padStart(8, "0");
  return (a + b).slice(0, 12);
}

export const short = (hash: string) => hash.slice(0, 7);

/** JSON.stringify with sorted keys so equal objects hash equally */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

let counter = 0;
/** short id for ingredients/components/steps */
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${rand}${counter.toString(36)}`;
}
