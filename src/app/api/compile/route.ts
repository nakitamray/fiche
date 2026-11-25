import { NextResponse } from "next/server";

/** forwards typst source to the python worker and streams the pdf back */
export async function POST(req: Request) {
  const worker = process.env.FICHE_WORKER_URL;
  if (!worker) {
    return NextResponse.json({ error: "no worker configured — set FICHE_WORKER_URL, or download the .typ" }, { status: 501 });
  }
  const { typst } = (await req.json()) as { typst?: string };
  if (!typst) return NextResponse.json({ error: "empty book" }, { status: 400 });

  try {
    const res = await fetch(`${worker.replace(/\/$/, "")}/compile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ typst }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return NextResponse.json({ error: `worker said ${res.status}: ${await res.text()}` }, { status: 502 });
    return new Response(await res.arrayBuffer(), {
      headers: { "content-type": "application/pdf", "content-disposition": 'attachment; filename="cookbook.pdf"' },
    });
  } catch {
    return NextResponse.json({ error: "worker isn't running" }, { status: 502 });
  }
}
