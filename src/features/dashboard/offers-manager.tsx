"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DashboardOffer } from "@/domain/dashboard/types";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { EmptyState } from "@/components/states/empty-state";

export function OffersManagerPage() {
  const { workspace, update } = useDashboard();
  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [description, setDescription] = useState("");

  function add() {
    if (!title.trim()) return;
    const offer: DashboardOffer = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      discountLabel: discount.trim() || "Special",
      active: true,
    };
    update((w) => ({ ...w, offers: [...w.offers, offer] }));
    setTitle("");
    setDiscount("");
    setDescription("");
  }

  return (
    <DashboardShell
      activePath="/business/dashboard/offers"
      title="Offers"
      description="Promote limited-time deals on your public profile."
    >
      <div className="border-border/70 bg-card space-y-3 rounded-2xl border p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="offer-title">Title</Label>
            <Input
              id="offer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="min-h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="offer-discount">Discount label</Label>
            <Input
              id="offer-discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="15% off"
              className="min-h-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offer-description">Description</Label>
          <Textarea
            id="offer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <Button type="button" onClick={add} disabled={!title.trim()}>
          Add offer
        </Button>
      </div>

      <ul className="space-y-3">
        {workspace.offers.length === 0 ? (
          <li>
            <EmptyState
              compact
              title="No active offers"
              description="Create a timely offer when you have something useful for customers."
            />
          </li>
        ) : null}
        {workspace.offers.map((offer) => (
          <li
            key={offer.id}
            className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div>
              <p className="font-medium">
                {offer.title}{" "}
                <Badge variant="secondary" className="ml-1">
                  {offer.discountLabel}
                </Badge>
              </p>
              <p className="text-muted-foreground text-sm">{offer.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                aria-label={`${offer.active ? "Deactivate" : "Activate"} ${offer.title}`}
                checked={offer.active}
                onCheckedChange={(active) =>
                  update((w) => ({
                    ...w,
                    offers: w.offers.map((o) =>
                      o.id === offer.id ? { ...o, active } : o,
                    ),
                  }))
                }
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  update((w) => ({
                    ...w,
                    offers: w.offers.filter((o) => o.id !== offer.id),
                  }))
                }
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
