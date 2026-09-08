"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type QueueOption = {
  value: string;
  label: string;
};

type QueueConfig<T> = {
  searchText: (item: T) => string;
  filterValue?: (item: T) => string;
  sorters: Record<string, (a: T, b: T) => number>;
  defaultSort: string;
  pageSize?: number;
};

export function useOperationalQueue<T>(items: readonly T[], config: QueueConfig<T>) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(config.defaultSort);
  const [page, setPage] = useState(1);
  const pageSize = config.pageSize ?? 8;

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matches = items.filter((item) => {
      const matchesSearch =
        !normalizedQuery ||
        config.searchText(item).toLocaleLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === "all" || !config.filterValue || config.filterValue(item) === filter;
      return matchesSearch && matchesFilter;
    });

    return [...matches].sort(config.sorters[sort] ?? config.sorters[config.defaultSort]);
  }, [config, filter, items, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return {
    query,
    setQuery: (value: string) => {
      setQuery(value);
      setPage(1);
    },
    filter,
    setFilter: (value: string) => {
      setFilter(value);
      setPage(1);
    },
    sort,
    setSort: (value: string) => {
      setSort(value);
      setPage(1);
    },
    page: currentPage,
    setPage,
    pageCount,
    pageItems,
    filteredCount: filteredItems.length,
    totalCount: items.length,
    reset: () => {
      setQuery("");
      setFilter("all");
      setSort(config.defaultSort);
      setPage(1);
    },
  };
}

type QueueControlsProps = {
  id: string;
  query: string;
  onQueryChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  filterOptions?: readonly QueueOption[];
  sortOptions: readonly QueueOption[];
  filteredCount: number;
  totalCount: number;
  resultLabel: string;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onReset: () => void;
  searchPlaceholder?: string;
};

export function QueueControls({
  id,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  filterOptions = [],
  sortOptions,
  filteredCount,
  totalCount,
  resultLabel,
  page,
  pageCount,
  onPageChange,
  onReset,
  searchPlaceholder = "Search queue",
}: QueueControlsProps) {
  const hasFilters = Boolean(query || filter !== "all");
  const resultWord = filteredCount === 1 ? resultLabel : `${resultLabel}s`;

  return (
    <div className="ap-surface space-y-3 rounded-2xl p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_auto_auto_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-search`}>Search</Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id={`${id}-search`}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
        </div>
        {filterOptions.length ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-filter`}>Status</Label>
            <Select value={filter} onValueChange={onFilterChange}>
              <SelectTrigger id={`${id}-filter`} className="w-full md:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-sort`}>Sort by</Label>
          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger id={`${id}-sort`} className="w-full md:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={onReset}>
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        ) : null}
      </div>
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
          {filteredCount} {resultWord}
          {filteredCount !== totalCount ? ` of ${totalCount}` : ""}
        </p>
        {pageCount > 1 ? (
          <nav
            aria-label={`${resultLabel} pagination`}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-muted-foreground min-w-20 text-center text-sm">
              Page {page} of {pageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
