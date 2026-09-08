import "server-only";

import { AppError } from "@/lib/errors/app-error";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { hasAnyAdminRole } from "@/domain/roles";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { hasSupabaseConfig } from "@/config/env";
import { isFeatureEnabled } from "@/config/feature-flags";

/**
 * Server-only admin gate. Never call from client components for authorization.
 * Client UI may hide controls, but every mutation must re-check here.
 */
export async function requireAdminSession(
  permission: Permission = "admin:access",
): Promise<SessionUser> {
  if (!isFeatureEnabled("adminConsoleEnabled")) {
    throw new AppError({
      message: "Admin console is disabled",
      code: "FEATURE_DISABLED",
      status: 503,
      expose: true,
    });
  }

  const user = await getSessionUser();
  if (user && hasAnyAdminRole(user.roles) && hasPermission(user.roles, permission)) {
    return user;
  }

  // Local development without Supabase — server-controlled only (not client roles)
  if (
    !hasSupabaseConfig() &&
    process.env.NODE_ENV === "development" &&
    process.env.ALLOW_DEV_ADMIN !== "false"
  ) {
    return {
      id: "00000000-0000-4000-8000-000000000001",
      email: "admin@localhost",
      displayName: "Dev Admin",
      roles: ["SUPER_ADMIN"],
    };
  }

  throw new AppError({
    message: "Admin access required",
    code: "FORBIDDEN",
    status: 403,
    expose: true,
  });
}

export async function getOptionalAdminSession(): Promise<SessionUser | null> {
  try {
    return await requireAdminSession();
  } catch {
    return null;
  }
}
