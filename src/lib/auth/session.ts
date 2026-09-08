import "server-only";

import { cache } from "react";
import type { AppRole } from "@/domain/roles";
import { APP_ROLES } from "@/domain/roles";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  roles: AppRole[];
};

function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export const getSessionUser = cache(
  async function getSessionUser(): Promise<SessionUser | null> {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [{ data: rolesRows }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);

    const roles = (rolesRows ?? []).map((r) => r.role as string).filter(isAppRole);

    return {
      id: user.id,
      email: user.email ?? null,
      displayName: profile?.display_name ?? null,
      roles: roles.length > 0 ? roles : ["USER"],
    };
  },
);
