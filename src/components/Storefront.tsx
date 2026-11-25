"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "vitrine" },
  { href: "/new", label: "new recipe" },
  { href: "/graph", label: "flavor map" },
  { href: "/cookbook", label: "cookbook" },
];

function Awning() {
  return (
    <div className="no-print relative z-10 [filter:drop-shadow(0_6px_6px_rgba(42,33,28,0.22))]">
      <div className="awning-stripes h-7 sm:h-9" />
      <div
        className="awning-stripes h-[14px]"
        style={{
          WebkitMaskImage: "radial-gradient(circle at 14px 0, #000 13.5px, transparent 14px)",
          maskImage: "radial-gradient(circle at 14px 0, #000 13.5px, transparent 14px)",
          WebkitMaskSize: "28px 14px",
          maskSize: "28px 14px",
          WebkitMaskRepeat: "repeat-x",
          maskRepeat: "repeat-x",
        }}
      />
    </div>
  );
}

export function Storefront({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print bg-awning text-[#efe4cc]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-6 gap-y-2 px-4 pb-3 pt-5 sm:px-6">
          <Link href="/" className="group flex items-baseline gap-3">
            <span className="font-display text-[44px] leading-none tracking-wide sm:text-[52px]">fiche</span>
            <span className="font-script text-2xl leading-none text-[#d9c9a6] sm:text-[28px]">maison</span>
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 pb-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`label border-b pb-0.5 transition-colors ${
                    active ? "border-[#efe4cc] text-[#efe4cc]" : "border-transparent text-[#efe4cc]/65 hover:text-[#efe4cc]"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <Awning />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">{children}</main>
      <footer className="no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="label text-ink/50">fiche · every bake has a hash</span>
          <span className="font-script text-xl text-oxblood/70">bon appétit</span>
        </div>
        <div className="checker h-10 [mask-image:linear-gradient(to_bottom,transparent,black_60%)]" />
      </footer>
    </div>
  );
}
