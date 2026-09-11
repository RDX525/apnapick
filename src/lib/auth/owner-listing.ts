import "server-only";

import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";

/** True when the signed-in user already belongs to a listing. */
export const userHasBusinessMembership = cache(async function userHasBusinessMembership(
  userId: string,
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", userId)
    .limit(1);

  return (data?.length ?? 0) > 0;
});
