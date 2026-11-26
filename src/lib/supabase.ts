"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

/** null when the env isn't set — the app then runs on localStorage alone */
export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = url && key ? createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;
  return client;
}

export const cloudConfigured = () => !!(url && key);
