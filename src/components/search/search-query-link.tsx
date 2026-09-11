"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore, type ComponentProps } from "react";
import { useDiscoveryArea } from "@/lib/geo/use-discovery-area";
import { discoverySearchHref } from "@/lib/search/resolve-search-location";

type SearchQueryLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  query: string;
};

function subscribe() {
  return () => undefined;
}

export function SearchQueryLink({
  query,
  children,
  ...props
}: SearchQueryLinkProps) {
  const { area, position } = useDiscoveryArea();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

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
