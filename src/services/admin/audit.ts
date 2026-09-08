import type { SessionUser } from "@/lib/auth/session";

export type AuditRecord = {
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminActionInput = {
  actor: SessionUser;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Every admin mutation must record an audit entry.
 * Persists to `audit_logs` when Supabase is available; always returns the record.
 */
export async function writeAdminAudit(input: AdminActionInput): Promise<AuditRecord> {
  const record: AuditRecord = {
    id: crypto.randomUUID(),
    actorId: input.actor.id,
    actorEmail: input.actor.email,
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
    if (supabase) {
      await supabase.from("audit_logs").insert({
        id: record.id,
        actor_id: input.actor.id.startsWith("00000000") ? null : input.actor.id,
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
    // Persistence optional in local/dev — record still returned for UI trail
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[admin_audit]", {
      action: record.action,
      entity: `${record.entityType}:${record.entityId ?? "-"}`,
      actor: record.actorEmail ?? record.actorId,
    });
  }

  return record;
}
