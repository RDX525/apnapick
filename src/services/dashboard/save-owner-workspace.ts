import type { DashboardWorkspace } from "@/domain/dashboard/types";
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
  }>;
  offers: DashboardWorkspace["offers"];
};

export function ownerEditPendingFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.ownerEditPending === true;
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
    priceLevel: profile.priceLevel,
    temporarilyClosed: workspace.temporarilyClosed,
    hours: workspace.hours,
    specialHours: workspace.specialHours,
    products: workspace.products
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim(),
        priceCents: item.priceCents,
        published: item.published,
        sortOrder: item.sortOrder,
      })),
    services: workspace.services
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        description: item.description.trim(),
        priceCents: item.priceCents,
        published: item.published,
        sortOrder: item.sortOrder,
      })),
    menu: workspace.menu
      .filter((category) => category.name.trim().length > 0)
      .map((category) => ({
        ...category,
        name: category.name.trim(),
        items: category.items.filter((item) => item.name.trim().length > 0),
      })),
    photos: workspace.photos.map((photo) => ({
      id: photo.id,
      name: photo.name,
      isCover: photo.isCover,
      role: photo.role,
      sortOrder: photo.sortOrder,
    })),
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
