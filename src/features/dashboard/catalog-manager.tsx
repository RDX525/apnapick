"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState } from "@/components/states/empty-state";
import { StatusBadge } from "@/components/operations/status-badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CatalogItem } from "@/domain/dashboard/types";
import { reorderById } from "@/services/dashboard/insights";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

type Kind = "product" | "service";

function blank(kind: Kind): CatalogItem {
  return {
    id: crypto.randomUUID(),
    kind,
    name: "",
    description: "",
    priceCents: null,
    published: true,
    sortOrder: 0,
    attributes: [],
  };
}

export function CatalogManagerPage({ kind }: { kind: Kind }) {
  const { workspace, update } = useDashboard();
  const items =
    kind === "product"
      ? [...workspace.products].sort((a, b) => a.sortOrder - b.sortOrder)
      : [...workspace.services].sort((a, b) => a.sortOrder - b.sortOrder);
  const title = kind === "product" ? "Products" : "Services";
  const path =
    kind === "product" ? "/business/dashboard/products" : "/business/dashboard/services";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  function setItems(next: CatalogItem[]) {
    update((w) =>
      kind === "product" ? { ...w, products: next } : { ...w, services: next },
    );
  }

  function saveItem(item: CatalogItem) {
    if (!item.name.trim()) return;
    const exists = items.some((i) => i.id === item.id);
    if (exists) {
      setItems(items.map((i) => (i.id === item.id ? item : i)));
    } else {
      setItems([...items, { ...item, sortOrder: items.length, kind }]);
    }
    setOpen(false);
    setEditing(null);
  }

  return (
    <DashboardShell
      activePath={path}
      title={title}
      description={`Create, edit, reorder, and publish/unpublish ${title.toLowerCase()}.`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {items.length} item{items.length === 1 ? "" : "s"} · owners and assigned staff
          only
        </p>
        <Button
          type="button"
          className="min-h-10"
          onClick={() => {
            setEditing(blank(kind));
            setOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add {kind}
        </Button>
      </div>

      <ul className="space-y-3">
        {items.length === 0 ? (
          <li>
            <EmptyState
              compact
              title={`No ${title.toLowerCase()} yet`}
              description="Add what customers search for."
            />
          </li>
        ) : (
          items.map((item, index) => (
            <li
              key={item.id}
              className="border-border/70 bg-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  <StatusBadge status={item.published ? "published" : "unpublished"} />
                </div>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {item.description || "No description"}
                  {item.priceCents != null
                    ? ` · ₹${(item.priceCents / 100).toFixed(0)}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 pr-2">
                  <Switch
                    checked={item.published}
                    onCheckedChange={(published) =>
                      setItems(
                        items.map((i) => (i.id === item.id ? { ...i, published } : i)),
                      )
                    }
                    aria-label={`Publish ${item.name}`}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === 0}
                  aria-label="Move up"
                  onClick={() => setItems(reorderById(items, item.id, "up"))}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  onClick={() => setItems(reorderById(items, item.id, "down"))}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => {
                    setEditing(item);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <ConfirmationDialog
                  title={`Delete ${item.name}?`}
                  description={`This permanently removes the ${kind} from your catalog.`}
                  confirmLabel={`Delete ${kind}`}
                  onConfirm={() => setItems(items.filter((i) => i.id !== item.id))}
                  trigger={
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </div>
            </li>
          ))
        )}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing && items.some((i) => i.id === editing.id)
                ? `Edit ${kind}`
                : `New ${kind}`}
            </DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="min-h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-desc">Description</Label>
                <Textarea
                  id="item-desc"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-price">Price (₹)</Label>
                <Input
                  id="item-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={
                    editing.priceCents == null
                      ? ""
                      : (editing.priceCents / 100).toString()
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priceCents:
                        e.target.value === ""
                          ? null
                          : Math.round(Number(e.target.value) * 100),
                    })
                  }
                  className="min-h-10"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => editing && saveItem(editing)}
              disabled={!editing?.name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
