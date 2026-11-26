"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Library, type Repo } from "./ast";
import { seedLibrary } from "./seed";
import { supabase } from "./supabase";
import { deleteRepo, pullLibrary, pushRepo } from "./sync";

/**
 * Library state.
 *
 * Signed out (or no Supabase env): lives in localStorage, works offline.
 * Signed in: Supabase is the source of truth. Edits apply locally first and
 * are pushed a moment later, repo by repo; localStorage stays as a cache.
 */

const KEY = "fiche.library.v1";
const PUSH_DELAY = 900;

export type SyncState = "local" | "loading" | "saving" | "saved" | "error";

interface Store {
  library: Library;
  ready: boolean;
  session: Session | null;
  sync: SyncState;
  syncError?: string;
  repo: (slug: string) => Repo | undefined;
  update: (slug: string, fn: (r: Repo) => Repo) => void;
  add: (repo: Repo) => void;
  remove: (slug: string) => void;
  reset: () => void;
  replace: (lib: Library) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

function readCache(): Library | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = Library.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [library, setLibrary] = useState<Library>(() => seedLibrary());
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState<string>();

  // what the database has, per slug: last pushed object + commit hashes
  const remote = useRef(new Map<string, { repo: Repo; hashes: Set<string> }>());
  const cloud = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // 1. local cache first, so the page is never empty
  useEffect(() => {
    const cached = readCache();
    if (cached) setLibrary(cached);
    setReady(true);
  }, []);

  // 2. auth
  useEffect(() => {
    const db = supabase();
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // 3. on sign-in, pull. An empty account gets the local library uploaded.
  const userId = session?.user.id;
  useEffect(() => {
    const db = supabase();
    cloud.current = false;
    remote.current.clear();
    if (!db || !userId) {
      setSync("local");
      return;
    }
    let cancelled = false;
    setSync("loading");
    (async () => {
      try {
        const repos = await pullLibrary(db);
        if (cancelled) return;
        if (repos.length) {
          for (const r of repos) remote.current.set(r.slug, { repo: r, hashes: new Set(Object.keys(r.commits)) });
          setLibrary({ version: 1, repos });
        }
        // if the account was empty, the effect below pushes whatever is local
        cloud.current = true;
        setSync("saved");
        setLibrary((lib) => ({ ...lib }));
      } catch (e) {
        if (!cancelled) {
          setSync("error");
          setSyncError((e as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 4. persist: cache always, push changed repos when signed in
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(library));
    } catch {
      // storage full or blocked; the session still works in memory
    }

    const db = supabase();
    if (!db || !userId || !cloud.current) return;

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const current = new Map(library.repos.map((r) => [r.slug, r]));
      const changed = library.repos.filter((r) => remote.current.get(r.slug)?.repo !== r);
      const gone = [...remote.current.keys()].filter((slug) => !current.has(slug));
      if (!changed.length && !gone.length) return;

      setSync("saving");
      try {
        for (const r of changed) {
          const hashes = await pushRepo(db, userId, r, remote.current.get(r.slug)?.hashes);
          remote.current.set(r.slug, { repo: r, hashes });
        }
        for (const slug of gone) {
          await deleteRepo(db, slug);
          remote.current.delete(slug);
        }
        setSync("saved");
        setSyncError(undefined);
      } catch (e) {
        setSync("error");
        setSyncError((e as Error).message);
      }
    }, PUSH_DELAY);
  }, [library, ready, userId]);

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
  const signOut = useCallback(async () => {
    await supabase()?.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ library, ready, session, sync, syncError, repo, update, add, remove, reset, replace, signOut }),
    [library, ready, session, sync, syncError, repo, update, add, remove, reset, replace, signOut],
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
