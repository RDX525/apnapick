"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { MenuCategory, MenuItem } from "@/domain/dashboard/types";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function MenuManagerPage() {
  const { workspace, update } = useDashboard();
  const [categoryName, setCategoryName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    workspace.menu[0]?.id ?? null,
  );

  const menu = [...workspace.menu].sort((a, b) => a.sortOrder - b.sortOrder);

  function setMenu(next: MenuCategory[]) {
    update((w) => ({ ...w, menu: next }));
  }

  function addCategory() {
    const name = categoryName.trim();
    if (!name) return;
    const cat: MenuCategory = {
      id: crypto.randomUUID(),
      name,
      sortOrder: menu.length,
      items: [],
    };
    setMenu([...menu, cat]);
    setActiveCategory(cat.id);
    setCategoryName("");
  }

  function addItem() {
    if (!activeCategory) return;
    const name = itemName.trim();
    if (!name) return;
    const price = itemPrice.trim() ? Math.round(Number(itemPrice) * 100) : null;
    const item: MenuItem = {
      id: crypto.randomUUID(),
      name,
      description: "",
      priceCents: Number.isFinite(price) ? price : null,
      published: true,
      sortOrder: 0,
      dietary: [],
    };
    setMenu(
      menu.map((c) =>
        c.id === activeCategory
          ? {
              ...c,
              items: [...c.items, { ...item, sortOrder: c.items.length }],
            }
          : c,
      ),
    );
    setItemName("");
    setItemPrice("");
  }

  return (
    <DashboardShell
      activePath="/business/dashboard/menu"
      title="Menu"
      description="Menu → category → item → description → price → dietary attributes."
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Label htmlFor="menu-category-name" className="sr-only">
          Category name
        </Label>
        <Input
          id="menu-category-name"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Category (for example, Chicken)"
          className="min-h-11"
        />
        <Button type="button" className="min-h-11" onClick={addCategory}>
          <Plus className="size-4" aria-hidden />
          Add category
        </Button>
      </div>

      {menu.length === 0 ? (
        <div className="border-border/80 bg-mist/40 text-muted-foreground rounded-2xl border border-dashed px-5 py-10 text-center text-sm">
          Start with a category like “Chicken”, then add “Chicken Curry”.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
          <ul className="space-y-1">
            {menu.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                    activeCategory === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="opacity-70">{c.items.length}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-4">
            {menu
              .filter((c) => c.id === activeCategory)
              .map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-ink text-2xl">{cat.name}</h2>
                    <ConfirmationDialog
                      title={`Delete ${cat.name}?`}
                      description={`This permanently removes the category and all ${cat.items.length} of its menu items.`}
                      confirmLabel="Delete category"
                      onConfirm={() => {
                        setMenu(menu.filter((c) => c.id !== cat.id));
                        setActiveCategory(menu.find((c) => c.id !== cat.id)?.id ?? null);
                      }}
                      trigger={
                        <Button type="button" variant="destructive" size="sm">
                          <Trash2 className="size-4" aria-hidden />
                          Delete category
                        </Button>
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Label htmlFor="menu-item-name" className="sr-only">
                      Item name
                    </Label>
                    <Input
                      id="menu-item-name"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Item name (e.g. Chicken Curry)"
                      className="min-h-10"
                    />
                    <Label htmlFor="menu-item-price" className="sr-only">
                      Item price in rupees
                    </Label>
                    <Input
                      id="menu-item-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="₹ price"
                      className="min-h-10 sm:w-28"
                    />
                    <Button type="button" onClick={addItem} className="min-h-10">
                      Add item
                    </Button>
                  </div>

                  <ul className="space-y-2">
                    {cat.items
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="border-border/70 bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                        >
                          <div>
                            <p className="font-medium">
                              {item.name}{" "}
                              <Badge
                                variant={item.published ? "secondary" : "outline"}
                                className="ml-1 text-[10px]"
                              >
                                {item.published ? "Live" : "Hidden"}
                              </Badge>
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {item.priceCents != null
                                ? `₹${(item.priceCents / 100).toFixed(0)}`
                                : "No price"}
                              {item.dietary.length ? ` · ${item.dietary.join(", ")}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              aria-label={`${item.published ? "Hide" : "Publish"} ${item.name}`}
                              checked={item.published}
                              onCheckedChange={(published) =>
                                setMenu(
                                  menu.map((c) =>
                                    c.id === cat.id
                                      ? {
                                          ...c,
                                          items: c.items.map((i) =>
                                            i.id === item.id ? { ...i, published } : i,
                                          ),
                                        }
                                      : c,
                                  ),
                                )
                              }
                            />
                            <ConfirmationDialog
                              title={`Delete ${item.name}?`}
                              description="This permanently removes the item from this menu category."
                              confirmLabel="Delete item"
                              onConfirm={() =>
                                setMenu(
                                  menu.map((c) =>
                                    c.id === cat.id
                                      ? {
                                          ...c,
                                          items: c.items.filter((i) => i.id !== item.id),
                                        }
                                      : c,
                                  ),
                                )
                              }
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
                      ))}
                  </ul>
                </div>
              ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
