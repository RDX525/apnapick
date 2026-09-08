import type { SessionUser } from "@/lib/auth/session";
import type { ReviewAuditAction } from "@/domain/reviews/types";

export type TrustAuditInput = {
  actor: SessionUser | null;
  action: ReviewAuditAction | string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Audit trail for trust & review mutations.
 * Works for authenticated users and admins.
 */
export async function writeTrustAudit(input: TrustAuditInput) {
  const record = {
    id: crypto.randomUUID(),
    actorId: input.actor?.id ?? null,
    actorEmail: input.actor?.email ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldData: input.oldData ?? null,
    newData: input.newData ?? null,
    createdAt: new Date().toISOString(),
  };

  try {
    const { createServerSupabaseClient } = await import("@/lib/db/supabase-server");
    const supabase = await createServerSupabaseClient();
    if (supabase && input.actor) {
      await supabase.from("audit_logs").insert({
        id: record.id,
        actor_id: input.actor.id,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        old_data: input.oldData ?? null,
        new_data: input.newData ?? null,
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
      });
    }
  } catch {
    // Persistence best-effort
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[trust_audit]", {
      action: record.action,
      entity: `${record.entityType}:${record.entityId ?? "-"}`,
      actor: record.actorEmail ?? record.actorId,
    });
  }

  return record;
}
