import { NextResponse } from "next/server";
import { decodeEntities, findRecipeJsonLd, jsonLdToText } from "@/lib/ingest";

/**
 * Fetch a recipe page and hand back plain text for the parser.
 * Prefers the page's schema.org JSON-LD (which skips the life story above
 * the recipe); falls back to stripped page text.
 */

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;
const MAX_BYTES = 3_000_000;

export async function POST(req: Request) {
  let url: URL;
  try {
    const body = (await req.json()) as { url?: string };
    url = new URL(String(body.url ?? ""));
  } catch {
    return NextResponse.json({ error: "that doesn't look like a link" }, { status: 400 });
  }
  if (!/^https?:$/.test(url.protocol) || PRIVATE_HOST.test(url.hostname)) {
    return NextResponse.json({ error: "only public http(s) links" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; fiche-recipe-import)", accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ error: `the site answered ${res.status}` }, { status: 502 });
    const buf = await res.arrayBuffer();
    html = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
  } catch {
    return NextResponse.json({ error: "couldn't reach that page" }, { status: 502 });
  }

  const node = findRecipeJsonLd(html);
  if (node) {
    return NextResponse.json({ text: jsonLdToText(node), source: "json-ld" });
  }

  const text = decodeEntities(
    html
      .replace(/<(script|style|nav|header|footer|aside|form|noscript)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 1)
    .join("\n");

  return NextResponse.json({ text, source: "page-text" });
}
