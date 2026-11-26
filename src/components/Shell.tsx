"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cloudConfigured } from "@/lib/supabase";
import { useLibrary, type SyncState } from "@/lib/store";

const NAV = [
  { href: "/", label: "la vitrine" },
  { href: "/new", label: "new recipe" },
  { href: "/graph", label: "flavor map" },
  { href: "/cookbook", label: "cookbook" },
];

const SYNC_LABEL: Record<SyncState, string> = {
  local: "on this device",
  loading: "opening…",
  saving: "saving…",
  saved: "saved",
  error: "not saved",
};

function SyncLink() {
  const { session, sync, syncError } = useLibrary();
  if (!cloudConfigured()) return null;
  return (
    <Link href="/account" className="label text-tile/70 hover:text-tile" title={syncError}>
      {session ? SYNC_LABEL[sync] : "sign in"}
    </Link>
  );
}

/** scalloped striped awning, flat, hanging off the bottom of the fascia */
function Awning() {
  const mask = {
    WebkitMaskImage: "radial-gradient(circle at 16px 0, #000 15.5px, transparent 16px)",
    maskImage: "radial-gradient(circle at 16px 0, #000 15.5px, transparent 16px)",
    WebkitMaskSize: "32px 16px",
    maskSize: "32px 16px",
    WebkitMaskRepeat: "repeat-x",
    maskRepeat: "repeat-x",
  } as const;
  return (
    <div className="no-print" aria-hidden>
      <div className="h-1.5 bg-forest-dark" />
      <div className="awning h-10" />
      <div className="relative h-4">
        <div className="awning absolute inset-0" style={mask} />
      </div>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print bg-forest text-tile">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-3 px-4 pb-3 pt-5 sm:px-6">
          <Link href="/" className="flex items-baseline gap-3" aria-label="fiche, home">
            <span className="font-serif text-[52px] leading-[0.8] sm:text-[60px]">fiche</span>
            <span className="label hidden text-tile/60 sm:inline">boulangerie de recettes</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`label border-b pb-0.5 ${active ? "border-tile text-tile" : "border-transparent text-tile/70 hover:text-tile"}`}
                >
                  {n.label}
                </Link>
              );
            })}
            <SyncLink />
          </nav>
        </div>
      </header>
      <Awning />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6">{children}</main>

      <footer className="no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-ink px-4 py-4 sm:px-6">
          <span className="label text-muted">fiche · every bake has a hash</span>
          <span className="font-serif text-lg italic text-oxblood">à demain</span>
        </div>
        <div className="oxtile h-16 border-t border-ink" />
      </footer>
    </div>
  );
}
