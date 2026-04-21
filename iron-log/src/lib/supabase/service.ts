import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client that uses the service role key. Bypasses
 * RLS — used for operations that need elevated privileges like writing
 * to private Storage buckets.
 *
 * NEVER import this from a client component / module that could end up
 * in the browser bundle. The "server-only" import above throws at
 * build time if that happens.
 */
let instance: ReturnType<typeof createClient> | null = null;

export function createServiceClient() {
  if (instance) return instance;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — set it in .env.local. Find it in Supabase Dashboard → Settings → API → service_role key."
    );
  }
  instance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return instance;
}

export const PROGRESS_PHOTOS_BUCKET = "progress-photos";
