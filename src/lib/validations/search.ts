import { z } from "zod";

function splitCsv(v: string | undefined): string[] | undefined {
  if (!v?.trim()) return undefined;
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function boolFlag(v: string | undefined): boolean | undefined {
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

export const searchQuerySchema = z
  .object({
    q: z.string().min(1).max(200),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    area: z.string().max(80).optional(),
    radius_m: z.coerce.number().min(100).max(50000).optional(),
    page: z.coerce.number().int().min(1).max(100).optional().default(1),
    page_size: z.coerce.number().int().min(1).max(50).optional().default(20),
    sort: z
      .enum(["relevance", "recommended", "distance", "rating", "reviews"])
      .optional()
      .default("recommended"),
    open_now: z.string().optional(),
    min_rating: z.coerce.number().min(1).max(5).optional(),
    price: z.string().optional(),
    category: z.string().optional(),
    attributes: z.string().optional(),
    services: z.string().optional(),
    has_offers: z.string().optional(),
    verified: z.string().optional(),
    session_id: z.string().max(80).optional(),
  })
  .transform((data) => {
    const priceParts = splitCsv(data.price);
    return {
      ...data,
      open_now: boolFlag(data.open_now),
      has_offers: boolFlag(data.has_offers) === true ? true : undefined,
      verified: boolFlag(data.verified) === true ? true : undefined,
      price: priceParts
        ?.map((p) => Number(p))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 4),
      category: splitCsv(data.category),
      attributes: splitCsv(data.attributes),
      services: splitCsv(data.services),
    };
  });

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export const searchActionSchema = z.object({
  businessId: z.string().uuid(),
  action: z.enum(["click", "call", "directions", "website", "save", "share"]),
  searchEventId: z.string().uuid().optional().nullable(),
  areaSlug: z.string().max(80).optional().nullable(),
  sessionId: z.string().max(80).optional().nullable(),
  queryNormalized: z.string().max(200).optional().nullable(),
});

export type SearchActionInput = z.infer<typeof searchActionSchema>;
