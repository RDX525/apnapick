import type { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getSessionUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/db/supabase-server";
import { createLogger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

const log = createLogger({ module: "business-leads" });

const bodySchema = z.object({
  status: z.enum(["READ", "NEW"]),
});

type Params = { params: Promise<{ id: string }> };

/** Mark a lead as read / unread for the owning business. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getSessionUser();
    if (!user) {
      throw new AppError({
        message: "Sign in required",
        code: "UNAUTHORIZED",
        status: 401,
        expose: true,
      });
    }

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError({
        message: "Invalid lead id",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({
        message: "Invalid payload",
        code: "VALIDATION_ERROR",
        status: 400,
        expose: true,
        details: parsed.error.flatten(),
      });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      throw new AppError({
        message: "Database unavailable",
        code: "DB_UNAVAILABLE",
        status: 503,
        expose: true,
      });
    }

    const readAt =
      parsed.data.status === "READ" ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("leads")
      .update({ read_at: readAt })
      .eq("id", id)
      .select("id, read_at")
      .maybeSingle();

    if (error) {
      log.warn("lead_update_failed", { message: error.message, leadId: id });
      throw new AppError({
        message: "Couldn’t update lead",
        code: "LEAD_UPDATE_FAILED",
        status: 500,
        expose: true,
        cause: error,
      });
    }

    if (!data) {
      throw new AppError({
        message: "Lead not found",
        code: "NOT_FOUND",
        status: 404,
        expose: true,
      });
    }

    return jsonOk({
      lead: {
        id: data.id,
        status: data.read_at ? "READ" : "NEW",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
