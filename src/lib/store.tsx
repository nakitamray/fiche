"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Library, type Repo } from "./ast";
import { seedLibrary } from "./seed";

/**
 * Library state. Lives in localStorage for now so the whole thing works
 * offline with zero setup; the Supabase tables in supabase/migrations mirror
 * this shape one-to-one for when it moves to a real backend.
 */

const KEY = "fiche.library.v1";

interface Store {
  library: Library;
  ready: boolean;
  repo: (slug: string) => Repo | undefined;
  update: (slug: string, fn: (r: Repo) => Repo) => void;
  add: (repo: Repo) => void;
  remove: (slug: string) => void;
  reset: () => void;
  replace: (lib: Library) => void;
}

const Ctx = createContext<Store | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Library>(() => seedLibrary());
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = Library.safeParse(JSON.parse(raw));
        if (parsed.success) setLibrary(parsed.data);
      }
    } catch {
      // private mode or corrupt data — fall back to the seed
    }
    loaded.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(library));
    } catch {
      // storage full or blocked; the session still works in memory
    }
  }, [library]);

  const repo = useCallback((slug: string) => library.repos.find((r) => r.slug === slug), [library]);

  const update = useCallback((slug: string, fn: (r: Repo) => Repo) => {
    setLibrary((lib) => ({ ...lib, repos: lib.repos.map((r) => (r.slug === slug ? fn(r) : r)) }));
  }, []);

  const add = useCallback((repo: Repo) => {
    setLibrary((lib) => ({ ...lib, repos: [repo, ...lib.repos.filter((r) => r.slug !== repo.slug)] }));
  }, []);

  const remove = useCallback((slug: string) => {
    setLibrary((lib) => ({ ...lib, repos: lib.repos.filter((r) => r.slug !== slug) }));
  }, []);

  const reset = useCallback(() => setLibrary(seedLibrary()), []);
  const replace = useCallback((lib: Library) => setLibrary(lib), []);

  const value = useMemo(
    () => ({ library, ready, repo, update, add, remove, reset, replace }),
    [library, ready, repo, update, add, remove, reset, replace],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLibrary(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useLibrary outside LibraryProvider");
  return s;
}

export function uniqueSlug(title: string, taken: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "recipe";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}
