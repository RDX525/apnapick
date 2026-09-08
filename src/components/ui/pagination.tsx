import Link from "next/link";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
  className?: string;
};

export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
    >
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {hasPrev ? (
          <Link
            href={hrefForPage(page - 1)}
            className="border-border hover:bg-muted inline-flex h-11 items-center rounded-full border px-4 text-sm"
          >
            Previous
          </Link>
        ) : (
          <span className="border-border text-muted-foreground inline-flex h-11 items-center rounded-full border px-4 text-sm opacity-50">
            Previous
          </span>
        )}
        {hasNext ? (
          <Link
            href={hrefForPage(page + 1)}
            className="border-border hover:bg-muted inline-flex h-11 items-center rounded-full border px-4 text-sm"
          >
            Next
          </Link>
        ) : (
          <span className="border-border text-muted-foreground inline-flex h-11 items-center rounded-full border px-4 text-sm opacity-50">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
