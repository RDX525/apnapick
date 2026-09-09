"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/operations/status-badge";
import { DEFAULT_CATEGORIES } from "@/config/consumer-content";
import { useDashboard } from "@/features/dashboard/dashboard-provider";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export function ProfileManagerPage() {
  const { workspace, update } = useDashboard();
  const p = workspace.profile;

  return (
    <DashboardShell
      activePath="/business/dashboard/profile"
      title="Profile"
      description="Core listing details shown on your public page."
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={p.status} />
        {p.ownerEditPending ? (
          <StatusBadge status="pending_review" label="Edits pending approval" />
        ) : null}
        <StatusBadge status={p.verificationStatus} />
        <StatusBadge
          status={p.completeness === 100 ? "complete" : "draft"}
          label={`${p.completeness}% complete`}
        />
      </div>

      <div className="border-border/70 bg-card grid gap-4 rounded-2xl border p-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Business name</Label>
          <Input
            id="name"
            value={p.name}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, name: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={p.description}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, description: e.target.value },
              }))
            }
            rows={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            value={p.categorySlug}
            onValueChange={(categorySlug) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, categorySlug },
              }))
            }
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_CATEGORIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">Price level</Label>
          <Select
            value={String(p.priceLevel ?? 2)}
            onValueChange={(value) =>
              update((w) => ({
                ...w,
                profile: {
                  ...w.profile,
                  priceLevel: Number(value),
                },
              }))
            }
          >
            <SelectTrigger id="price" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">₹</SelectItem>
              <SelectItem value="2">₹₹</SelectItem>
              <SelectItem value="3">₹₹₹</SelectItem>
              <SelectItem value="4">₹₹₹₹</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={p.phone}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, phone: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={p.email}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, email: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={p.website}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, website: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={p.addressLine1}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, addressLine1: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="suburb">Suburb</Label>
          <Input
            id="suburb"
            value={p.suburb}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, suburb: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={p.city}
            onChange={(e) =>
              update((w) => ({
                ...w,
                profile: { ...w.profile, city: e.target.value },
              }))
            }
            className="min-h-11"
          />
        </div>
      </div>
    </DashboardShell>
  );
}
