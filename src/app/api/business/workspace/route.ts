import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { requireWritableDatabase } from "@/lib/db/require-writable-db";
import { publicMutationMessage, providerErrorText } from "@/lib/errors/public-message";
import { createLogger } from "@/lib/logging/logger";
import { canManageBusiness } from "@/services/business/ownership";
import { fetchOwnerListingSnapshot } from "@/repositories/dashboard/owner-workspace-repository";
import { workspaceFromOwnerListing } from "@/services/dashboard/owner-workspace";
import {
  ownerWorkspaceSavePayload,
  workspaceSaveCompleteness,
} from "@/services/dashboard/save-owner-workspace";
import { resolveOwnerLocationForSave } from "@/services/dashboard/resolve-owner-location";
import { geocodeLocation } from "@/services/geo/geo-service";
import type { DashboardWorkspace } from "@/domain/dashboard/types";

export const dynamic = "force-dynamic";

const log = createLogger({ module: "owner-workspace" });

const BUSINESS_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Load the signed-in owner's listing into the dashboard workspace.
 * Anonymous / local-only clients receive `workspace: null`.
 */
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonOk({ workspace: null, source: "anonymous" });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return jsonOk({ workspace: null, source: "local" });
    }

    const snapshot = await fetchOwnerListingSnapshot(supabase, user.id).catch((error) => {
      throw new AppError({
        message: "Couldn’t load your listing.",
        code: "OWNER_WORKSPACE_LOAD_FAILED",
        status: 500,
        expose: true,
        cause: error,
      });
    });
    return jsonOk({
      workspace: snapshot ? workspaceFromOwnerListing(snapshot) : null,
      source: "supabase",
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Persist dashboard workspace snapshot for authenticated owners.
 * Anonymous clients keep localStorage only.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = (await request.json()) as {
      workspace?: DashboardWorkspace;
    };
    const workspace = body.workspace;
    const businessId = workspace?.profile.businessId;

    if (!user) {
      return jsonOk({ ok: true, persisted: false, queuedForReview: false });
    }

    const supabase = requireWritableDatabase(
      await createServerSupabaseClient(),
      "Listing save",
    );
    if (!businessId || !BUSINESS_ID_RE.test(businessId) || !workspace) {
      throw new AppError({
        message: "Business required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    if (!workspace.profile.name.trim()) {
      throw new AppError({
        message: "Business name required",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const { data: membership } = await supabase
      .from("business_members")
      .select("business_id, user_id, role, permissions")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const allowed = canManageBusiness({
      userId: user.id,
      roles: user.roles,
      membership: membership
        ? {
            businessId: membership.business_id as string,
            userId: membership.user_id as string,
            role: membership.role as "OWNER" | "STAFF",
            permissions: membership.permissions,
          }
        : null,
    });

    if (!allowed) {
      throw new AppError({
        message: "Forbidden",
        code: "FORBIDDEN",
        status: 403,
        expose: true,
      });
    }

    const { data: primaryLocation } = await supabase
      .from("business_locations")
      .select("id")
      .eq("business_id", businessId)
      .eq("is_primary", true)
      .maybeSingle();

    const located = await resolveOwnerLocationForSave(workspace, {
      hasPrimaryLocation: Boolean(primaryLocation),
      geocode: geocodeLocation,
    });

    const { error: coverResetError } = await supabase
      .from("photos")
      .update({ is_cover: false })
      .eq("business_id", businessId)
      .eq("is_cover", true)
      .is("deleted_at", null);
    if (coverResetError) {
      log.warn("photo_cover_reset_failed", {
        businessId,
        message: coverResetError.message,
      });
    }

    const { data, error } = await supabase.rpc("save_owner_workspace", {
      p_business_id: businessId,
      p_payload: ownerWorkspaceSavePayload(located),
      p_completeness: workspaceSaveCompleteness(located),
    });

    if (error) {
      const raw = providerErrorText(error);
      log.warn("owner_workspace_save_failed", { businessId, message: raw });
      throw new AppError({
        message: publicMutationMessage(raw, "Couldn’t save your listing."),
        code: "OWNER_WORKSPACE_SAVE_FAILED",
        status: 400,
        expose: true,
        cause: error,
      });
    }

    const result = (data ?? {}) as {
      status?: string;
      queuedForReview?: boolean;
      completeness?: number;
    };

    return jsonOk({
      ok: true,
      persisted: true,
      queuedForReview: Boolean(result.queuedForReview),
      status: result.status ?? workspace.profile.status,
      completeness: result.completeness ?? workspace.profile.completeness,
    });
  } catch (error) {
    return jsonError(error);
  }
}
