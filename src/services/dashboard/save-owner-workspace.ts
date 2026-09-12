import type { DashboardWorkspace } from "@/domain/dashboard/types";
import type { DayHours, SpecialHoursEntry } from "@/domain/onboarding/types";
import { isPersistedStoragePath } from "@/lib/media/photo-storage";
import { scoreWorkspaceCompleteness } from "@/services/dashboard/workspace";

export type OwnerWorkspaceSavePayload = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  categorySlug: string;
  suburb: string;
  city: string;
  addressLine1: string;
  lat: number | null;
  lng: number | null;
  priceLevel: number | null;
  temporarilyClosed: boolean;
  hours: DashboardWorkspace["hours"];
  specialHours: DashboardWorkspace["specialHours"];
  products: Array<{
    id: string;
    name: string;
    description: string;
    priceCents: number | null;
    published: boolean;
    sortOrder: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    description: string;
    priceCents: number | null;
    published: boolean;
    sortOrder: number;
  }>;
  menu: DashboardWorkspace["menu"];
  photos: Array<{
    id: string;
    name: string;
    isCover: boolean;
    role: DashboardWorkspace["photos"][number]["role"];
    sortOrder: number;
    storagePath: string | null;
  }>;
  offers: DashboardWorkspace["offers"];
};

export function ownerEditPendingFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.ownerEditPending === true;
}

function clockForSave(value: string | null | undefined): string | null {
  const match = value?.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)/);
  if (!match) return null;
  return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function moneyCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function priceLevel(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(4, Math.round(value)));
}

function pin(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

function sanitizeHours(hours: DayHours[]): DayHours[] {
  const byDay = new Map<number, DayHours>();
  for (const day of hours) {
    const dayOfWeek = Math.round(Number(day.dayOfWeek));
    if (!Number.isFinite(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;
    const opensAt = clockForSave(day.opensAt);
    const closesAt = clockForSave(day.closesAt);
    if (day.isClosed || !opensAt || !closesAt) {
      byDay.set(dayOfWeek, {
        dayOfWeek,
        isClosed: true,
        opensAt: null,
        closesAt: null,
      });
    } else {
      byDay.set(dayOfWeek, { dayOfWeek, isClosed: false, opensAt, closesAt });
    }
  }
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    return (
      byDay.get(dayOfWeek) ?? {
        dayOfWeek,
        isClosed: true,
        opensAt: null,
        closesAt: null,
      }
    );
  });
}

function photosForSave(photos: DashboardWorkspace["photos"]) {
  const rows = photos.map((photo) => ({
    id: photo.id,
    name: photo.name,
    isCover: photo.isCover,
    role: photo.role,
    sortOrder: photo.sortOrder,
    storagePath: isPersistedStoragePath(photo.storagePath)
      ? photo.storagePath.trim()
      : null,
  }));
  const coverId =
    rows.find((photo) => photo.isCover || photo.role === "cover")?.id ??
    rows[0]?.id;
  return rows.map((photo) => {
    const isCover = photo.id === coverId;
    return {
      ...photo,
      isCover,
      role: photo.role === "logo" ? "logo" : isCover ? "cover" : "gallery",
    };
  });
}

function sanitizeSpecialHours(entries: SpecialHoursEntry[]): SpecialHoursEntry[] {
  return entries
    .filter((entry) => Boolean(entry.date?.trim()))
    .map((entry) => {
      const opensAt = clockForSave(entry.opensAt);
      const closesAt = clockForSave(entry.closesAt);
      if (entry.isClosed || !opensAt || !closesAt) {
        return { ...entry, isClosed: true, opensAt: null, closesAt: null };
      }
      return { ...entry, opensAt, closesAt, isClosed: false };
    });
}

/** Map the live dashboard workspace into the SQL save payload. */
export function ownerWorkspaceSavePayload(
  workspace: DashboardWorkspace,
): OwnerWorkspaceSavePayload {
  const profile = workspace.profile;
  return {
    name: profile.name.trim(),
    description: profile.description.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
    categorySlug: profile.categorySlug.trim(),
    suburb: profile.suburb.trim(),
    city: profile.city.trim(),
    addressLine1: profile.addressLine1.trim(),
    lat: pin(profile.lat),
    lng: pin(profile.lng),
    priceLevel: priceLevel(profile.priceLevel),
    temporarilyClosed: workspace.temporarilyClosed,
    hours: sanitizeHours(workspace.hours),
    specialHours: sanitizeSpecialHours(workspace.specialHours),
    products: workspace.products
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim(),
        priceCents: moneyCents(item.priceCents),
        published: item.published,
        sortOrder: item.sortOrder,
      })),
    services: workspace.services
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim(),
        priceCents: moneyCents(item.priceCents),
        published: item.published,
        sortOrder: item.sortOrder,
      })),
    menu: workspace.menu
      .filter((category) => category.name.trim().length > 0)
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        items: category.items
          .filter((item) => item.name.trim().length > 0)
          .map((item) => ({
            ...item,
            name: item.name.trim(),
            priceCents: moneyCents(item.priceCents),
          })),
      })),
    photos: photosForSave(workspace.photos),
    offers: workspace.offers
      .filter((offer) => offer.title.trim().length > 0)
      .map((offer) => ({
        ...offer,
        title: offer.title.trim(),
        description: offer.description.trim(),
        discountLabel: offer.discountLabel.trim(),
      })),
  };
}

export function workspaceSaveCompleteness(workspace: DashboardWorkspace): number {
  return scoreWorkspaceCompleteness(workspace);
}
