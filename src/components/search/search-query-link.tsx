"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useDiscoveryArea } from "@/lib/geo/use-discovery-area";
import { discoverySearchHref } from "@/lib/search/resolve-search-location";

type SearchQueryLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  query: string;
};

export function SearchQueryLink({
  query,
  children,
  ...props
}: SearchQueryLinkProps) {
  const { area, position } = useDiscoveryArea();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const href = useMemo(
    () =>
      discoverySearchHref({
        query,
        dropdownArea: mounted ? area : undefined,
        devicePosition: mounted ? position : null,
      }),
    [area, mounted, position, query],
  );

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
}
