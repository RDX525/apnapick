import Link from "next/link";
import type { SeoBreadcrumb } from "@/domain/seo/types";
import { cn } from "@/lib/utils";

export function Breadcrumbs({
  items,
  className,
}: {
  items: SeoBreadcrumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav
      className={cn("text-muted-foreground text-sm", className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}:${crumb.path}`} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden>/</span> : null}
              {last ? (
                <span className="text-foreground" aria-current="page">
                  {crumb.name}
                </span>
              ) : (
                <Link href={crumb.path} className="hover:text-foreground">
                  {crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
