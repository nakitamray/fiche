"use client";

import { useState } from "react";
import { useLibrary } from "@/lib/store";
import { cloudConfigured, supabase } from "@/lib/supabase";

export default function Account() {
  const { session, sync, syncError, signOut, library } = useLibrary();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!cloudConfigured()) {
    return (
      <div className="enamel mx-auto max-w-lg px-8 py-10 text-center">
        <p className="font-script text-3xl text-glaze">just this kitchen</p>
        <h1 className="font-display text-5xl">no sync set up</h1>
        <p className="mt-3 text-ink/70">
          recipes are saved in this browser. to keep them in supabase, set <span className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
          <span className="font-mono text-[12px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> in <span className="font-mono text-[12px]">.env.local</span> and restart.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="enamel px-8 py-10">
        {session ? (
          <div className="text-center">
            <p className="font-script text-3xl text-glaze">welcome back</p>
            <h1 className="font-display text-5xl leading-none">your book</h1>
            <p className="label mt-4 text-ink/55">{session.user.email}</p>
            <ul className="mx-auto mt-6 max-w-xs space-y-1.5 text-left">
              {[
                ["recipes", String(library.repos.length)],
                ["sync", sync],
              ].map(([k, v]) => (
                <li key={k} className="flex items-baseline gap-1 font-mono text-[12px] uppercase tracking-[0.1em]">
                  <span>{k}</span>
                  <span className="flex-1 translate-y-[-0.2em] border-b border-dotted border-ink/25" />
                  <span className="text-glaze">{v}</span>
                </li>
              ))}
            </ul>
            {syncError && <p className="mt-4 text-[14px] text-glaze">{syncError}</p>}
            <button onClick={signOut} className="btn-ghost mt-8">
              sign out
            </button>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const db = supabase();
              if (!db) return;
              setBusy(true);
              setError(undefined);
              const { error } = await db.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: `${window.location.origin}/account` },
              });
              setBusy(false);
              if (error) setError(error.message);
              else setSent(true);
            }}
            className="text-center"
          >
            <p className="font-script text-3xl text-glaze">keep it somewhere safe</p>
            <h1 className="font-display text-5xl leading-none">sign in</h1>
            {sent ? (
              <p className="mt-6 text-ink/75">check your email for a link. open it on this device and you&apos;re in.</p>
            ) : (
              <>
                <p className="mt-3 text-ink/70">
                  we&apos;ll email you a link. if your account is empty, whatever&apos;s on this device gets moved over.
                </p>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="field mt-6 text-center"
                />
                <button className="btn-glaze mt-4" disabled={busy || !email}>
                  {busy ? "sending…" : "send the link"}
                </button>
              </>
            )}
            {error && <p className="mt-4 text-[14px] text-glaze">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
