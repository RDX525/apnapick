"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/operations/status-badge";
import type { TeamMember } from "@/domain/dashboard/types";
import {
  canManageBusiness,
  recordOwnershipChange,
  type OwnershipAuditEvent,
} from "@/services/business/ownership";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function TeamManagerPage() {
  const { workspace, update } = useDashboard();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [auditLog] = useState<OwnershipAuditEvent[]>([]);

  const actor = workspace.team.find((t) => t.role === "OWNER");

  async function invite() {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    if (workspace.team.some((t) => t.email === trimmed)) {
      setError("That person is already on the team.");
      return;
    }

    const allowed = canManageBusiness({
      userId: actor?.id ?? "owner",
      roles: ["BUSINESS_OWNER"],
      membership: {
        businessId: workspace.profile.businessId,
        userId: actor?.id ?? "owner",
        role: "OWNER",
      },
    });
    if (!allowed) {
      setError("Only owners can invite staff.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/business/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          businessId: workspace.profile.businessId,
          email: trimmed,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        member?: TeamMember;
      };
      if (!response.ok || !body.member) {
        setError(body.error ?? "Couldn’t send that invite.");
        return;
      }

      recordOwnershipChange(auditLog, {
        action: "member_added",
        businessId: workspace.profile.businessId,
        actorId: actor?.id ?? "owner",
        subjectUserId: body.member.id,
        toRole: "STAFF",
      });

      update((w) => ({ ...w, team: [...w.team, body.member!] }));
      setEmail("");
    } catch {
      setError("Couldn’t send that invite.");
    } finally {
      setPending(false);
    }
  }

  async function removeMember(id: string) {
    const target = workspace.team.find((t) => t.id === id);
    if (!target || target.role === "OWNER") return;

    const response = await fetch("/api/business/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "remove",
        businessId: workspace.profile.businessId,
        memberId: id,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(body.error ?? "Couldn’t remove this team member.");
    }

    recordOwnershipChange(auditLog, {
      action: "member_removed",
      businessId: workspace.profile.businessId,
      actorId: actor?.id ?? "owner",
      subjectUserId: id,
      fromRole: target.role,
    });

    update((w) => ({ ...w, team: w.team.filter((t) => t.id !== id) }));
  }

  function setRole(id: string, role: "OWNER" | "STAFF") {
    const target = workspace.team.find((t) => t.id === id);
    if (!target || target.role === "OWNER") return;
    recordOwnershipChange(auditLog, {
      action: "role_changed",
      businessId: workspace.profile.businessId,
      actorId: actor?.id ?? "owner",
      subjectUserId: id,
      fromRole: target.role,
      toRole: role,
    });
    update((w) => ({
      ...w,
      team: w.team.map((t) =>
        t.id === id
          ? {
              ...t,
              role,
              permissions: role === "OWNER" ? ["manage_all"] : ["manage_profile"],
            }
          : t,
      ),
    }));
  }

  return (
    <DashboardShell
      activePath="/business/dashboard/team"
      title="Team"
      description="Invite staff, assign roles, and remove access. Ownership changes are audited."
    >
      <div className="border-border/70 bg-card rounded-2xl border p-5">
        <Label htmlFor="invite-email">Invite staff by email</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="chef@example.com"
            className="min-h-11"
          />
          <Button type="button" className="min-h-11" onClick={() => void invite()} disabled={pending}>
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-destructive mt-2 text-sm">
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            They need an ApnaPick account first. Staff get manage_profile by default.
            Only owners can invite or remove.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {workspace.team.map((member) => (
          <li
            key={member.id}
            className="border-border/70 bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{member.displayName}</p>
              <p className="text-muted-foreground text-sm">{member.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={member.role} />
                <StatusBadge status={member.status} />
              </div>
            </div>
            {member.role !== "OWNER" ? (
              <div className="flex flex-wrap gap-2">
                <ConfirmationDialog
                  title={`Make ${member.displayName} an owner?`}
                  description="Owners receive full management access. Only grant this role to someone you trust."
                  confirmLabel="Grant owner access"
                  onConfirm={() => setRole(member.id, "OWNER")}
                  trigger={
                    <Button type="button" variant="outline">
                      Make owner
                    </Button>
                  }
                />
                <ConfirmationDialog
                  title={`Remove ${member.displayName}?`}
                  description="This revokes their access to manage this business. You can invite them again later."
                  confirmLabel="Remove access"
                  onConfirm={() => removeMember(member.id)}
                  trigger={
                    <Button type="button" variant="destructive">
                      Remove
                    </Button>
                  }
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">Primary owner</p>
            )}
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
