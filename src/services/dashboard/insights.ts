import type { DashboardInsight, DashboardWorkspace } from "@/domain/dashboard/types";

/** Actionable owner insights derived from workspace state + metrics. */
export function buildDashboardInsights(
  workspace: DashboardWorkspace,
): DashboardInsight[] {
  const insights: DashboardInsight[] = [];
  const menuItemCount = workspace.menu.reduce((n, c) => n + c.items.length, 0);
  const publishedProducts = workspace.products.filter((p) => p.published).length;
  const photoCount = workspace.photos.length;
  const hoursSet = workspace.hours.some((h) => !h.isClosed);

  if (workspace.profile.status === "PENDING_REVIEW") {
    insights.push({
      id: "pending-review",
      tone: "info",
      title: "Your listing is waiting for admin approval.",
      body: "Profile, hours, and catalog edits are saved. They go live after an admin publishes the listing.",
    });
  } else if (workspace.profile.ownerEditPending) {
    insights.push({
      id: "owner-edits-review",
      tone: "info",
      title: "Latest edits are with admin for review.",
      body: "Your live listing stays published. An admin will confirm the new details from the businesses queue.",
    });
  }

  if (
    menuItemCount < 3 &&
    (workspace.profile.categorySlug === "restaurants" ||
      workspace.profile.categorySlug === "food-dining")
  ) {
    const need = 3 - menuItemCount;
    insights.push({
      id: "menu-items",
      tone: "action",
      title: `Add ${need} more menu item${need === 1 ? "" : "s"} to improve profile completeness.`,
      body: "Menus help customers find dishes like chicken curry in search.",
      href: "/business/dashboard/menu",
      cta: "Edit menu",
    });
  }

  if (photoCount < 3) {
    insights.push({
      id: "photos",
      tone: "action",
      title: "Add photos to make your profile more useful.",
      body: `You have ${photoCount} photo${photoCount === 1 ? "" : "s"}. Aim for at least 3 including a cover.`,
      href: "/business/dashboard/photos",
      cta: "Upload photos",
    });
  } else if (!workspace.photos.some((p) => p.isCover)) {
    insights.push({
      id: "cover",
      tone: "action",
      title: "Set a cover photo for stronger search cards.",
      body: "Cover images appear first on your public profile and results.",
      href: "/business/dashboard/photos",
      cta: "Set cover",
    });
  }

  if (publishedProducts + workspace.services.filter((s) => s.published).length < 1) {
    insights.push({
      id: "catalog",
      tone: "action",
      title: "Publish products or services people search for.",
      body: "Intent-first discovery matches on what you actually offer.",
      href: "/business/dashboard/products",
      cta: "Add products",
    });
  }

  if (!hoursSet && !workspace.temporarilyClosed) {
    insights.push({
      id: "hours",
      tone: "action",
      title: "Set weekly opening hours.",
      body: "Accurate hours power “open now” filters and trust.",
      href: "/business/dashboard/hours",
      cta: "Edit hours",
    });
  }

  if (workspace.profile.verificationStatus !== "VERIFIED") {
    insights.push({
      id: "verify",
      tone: "action",
      title: "Complete ownership verification.",
      body: `Status: ${workspace.profile.verificationStatus}. Verified profiles rank with higher trust.`,
      href: "/business/onboarding",
      cta: "Continue verification",
    });
  }

  if (workspace.metrics.searchAppearances > 0) {
    insights.push({
      id: "search-appearances",
      tone: "info",
      title: `Your profile appeared in ${workspace.metrics.searchAppearances.toLocaleString("en-IN")} searches this month.`,
      body: `${workspace.metrics.clicks.toLocaleString("en-IN")} result clicks · ${workspace.metrics.profileViews.toLocaleString("en-IN")} profile views.`,
      href: "/business/dashboard/analytics",
      cta: "View analytics",
    });
  }

  if (workspace.leads.some((l) => l.status === "NEW")) {
    const n = workspace.leads.filter((l) => l.status === "NEW").length;
    insights.push({
      id: "leads",
      tone: "info",
      title: `You have ${n} new enquir${n === 1 ? "y" : "ies"} to review.`,
      body: "Respond quickly to convert search interest into customers.",
      href: "/business/dashboard/leads",
      cta: "Open leads",
    });
  }

  if (
    workspace.profile.completeness >= 80 &&
    workspace.profile.verificationStatus === "VERIFIED"
  ) {
    insights.push({
      id: "strong",
      tone: "success",
      title: "Your profile is in strong shape.",
      body: "Keep photos and hours fresh, and add seasonal offers when you can.",
      href: "/business/dashboard/offers",
      cta: "Manage offers",
    });
  }

  return insights;
}

export function reorderById<T extends { id: string; sortOrder: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): T[] {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((i) => i.id === id);
  if (index < 0) return items;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return items;
  const next = [...sorted];
  const tmp = next[index]!;
  next[index] = next[swapWith]!;
  next[swapWith] = tmp;
  return next.map((item, i) => ({ ...item, sortOrder: i }));
}
