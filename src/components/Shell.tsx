"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cloudConfigured } from "@/lib/supabase";
import { useLibrary, type SyncState } from "@/lib/store";
import { Sunlight } from "./Sunlight";

const NAV = [
  { href: "/", label: "the counter" },
  { href: "/new", label: "new recipe" },
  { href: "/graph", label: "flavor map" },
  { href: "/cookbook", label: "cookbook" },
];

const SYNC_LABEL: Record<SyncState, string> = {
  local: "on this device",
  loading: "opening the book…",
  saving: "saving…",
  saved: "saved",
  error: "not saved",
};

function SyncChip() {
  const { session, sync, syncError } = useLibrary();
  if (!cloudConfigured()) return null;
  const dot = sync === "error" ? "bg-glaze" : sync === "saved" ? "bg-bottle-light" : sync === "local" ? "bg-ink/30" : "bg-honey animate-pulse";
  return (
    <Link href="/account" className="label flex items-center gap-2 text-ink/60 hover:text-ink" title={syncError}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {session ? SYNC_LABEL[sync] : "sign in"}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Sunlight />
      <header className="no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pb-4 pt-7 sm:px-6">
          <Link href="/" className="flex items-end gap-3" aria-label="fiche, home">
            <span className="gilt font-display text-[54px] leading-[0.8] sm:text-[64px]">fiche</span>
            <span className="mb-0.5 hidden font-script text-[26px] leading-none text-glaze sm:inline">maison</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`label relative pb-1 transition-colors ${active ? "text-glaze" : "text-ink/55 hover:text-ink"}`}
                >
                  {n.label}
                  {active && <span className="absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-brass to-transparent" />}
                </Link>
              );
            })}
            <SyncChip />
          </nav>
        </div>
        <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-brass/50 to-transparent" />
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-8 sm:px-6">{children}</main>

      <footer className="no-print">
        <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <span className="label text-ink/40">fiche · every bake has a hash</span>
          <span className="font-script text-2xl text-glaze/70">à bientôt</span>
        </div>
      </footer>
    </div>
  );
}
