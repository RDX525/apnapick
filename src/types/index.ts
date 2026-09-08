export type { AppRole } from "@/domain/roles";
export type {
  BusinessSummary,
  BusinessStatus,
  ClaimStatus,
} from "@/domain/business/types";
export type {
  ParsedSearchQuery,
  RankedSearchResult,
  SearchRequest,
  SearchResponse,
} from "@/domain/search/types";

export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
