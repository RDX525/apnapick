import { isDiscoveryAreaSlug } from "@/config/geo-areas";

const HUB_SECTIONS = ["/food-dining", "/beauty-personal-care", "/areas"] as const;

export const PRIMARY_NAV = [
  { href: "/search", label: "Discover" },
  { href: "/food-dining/pune", label: "Food & Dining" },
  { href: "/beauty-personal-care/pune", label: "Beauty" },
  { href: "/areas/pune", label: "Areas" },
] as const;

/** Hub links for the selected discovery area. Current-location falls back to city-wide Pune. */
export function primaryNavForArea(area: string) {
  const slug = isDiscoveryAreaSlug(area) ? area : "pune";
  return [
    { href: "/search", label: "Discover" },
    { href: `/food-dining/${slug}`, label: "Food & Dining" },
    { href: `/beauty-personal-care/${slug}`, label: "Beauty" },
    { href: `/areas/${slug}`, label: "Areas" },
  ] as const;
}

export function navLinkIsActive(pathname: string, href: string) {
  const path = new URL(href, "https://apnapick.local").pathname;
  if (path === "/") return pathname === "/";
  const section = `/${path.split("/")[1] ?? ""}`;
  if ((HUB_SECTIONS as readonly string[]).includes(section)) {
    return pathname === section || pathname.startsWith(`${section}/`);
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
