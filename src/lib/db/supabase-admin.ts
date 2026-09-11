import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readServiceRoleKey } from "@/config/env";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = readServiceRoleKey();
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminDataClient = {
  supabase: SupabaseClient;
  canManageAuthUsers: boolean;
};

/**
 * Prefer the service role (bypasses RLS, Auth Admin API).
 * After a real admin login, fall back to that session — RLS already
 * grants is_admin() reads/writes, so the console can load without a
 * service-role key on the server.
 */
export async function createAdminDataClient(): Promise<AdminDataClient | null> {
  if (readServiceRoleKey() && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { supabase: createAdminClient(), canManageAuthUsers: true };
  }
  const session = await createServerSupabaseClient();
  if (!session) return null;
  return { supabase: session as unknown as SupabaseClient, canManageAuthUsers: false };
}
