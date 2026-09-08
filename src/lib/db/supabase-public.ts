import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/config/env";

/** Cookie-free anon client for public, cacheable reads. */
export function createPublicSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
