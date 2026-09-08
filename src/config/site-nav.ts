import { isDiscoveryAreaSlug } from "@/config/geo-areas";

export const PRIMARY_NAV = [
  { href: "/search", label: "Discover" },
  { href: "/restaurants/pune", label: "Restaurants" },
  { href: "/services/pune", label: "Services" },
  { href: "/areas/pune", label: "Areas" },
] as const;

/** Hub links for the selected discovery area. Current-location falls back to city-wide Pune. */
export function primaryNavForArea(area: string) {
  const slug = isDiscoveryAreaSlug(area) ? area : "pune";
  return [
    { href: "/search", label: "Discover" },
    { href: `/restaurants/${slug}`, label: "Restaurants" },
    { href: `/services/${slug}`, label: "Services" },
    { href: `/areas/${slug}`, label: "Areas" },
  ] as const;
}

export function navLinkIsActive(pathname: string, href: string) {
  const path = new URL(href, "https://apnapick.local").pathname;
  if (path === "/") return pathname === "/";
  const section = `/${path.split("/")[1] ?? ""}`;
  if (["/restaurants", "/services", "/areas"].includes(section)) {
    return pathname === section || pathname.startsWith(`${section}/`);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
