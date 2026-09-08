import { z } from "zod";

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
  .nullable()
  .optional();

export const dayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  opensAt: hhmm,
  closesAt: hhmm,
  opensAt2: hhmm,
  closesAt2: hhmm,
});

export const catalogItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["product", "dish", "service"]),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  priceCents: z.number().int().min(0).nullable(),
  available: z.boolean(),
  attributes: z.array(z.string()).default([]),
  photoDataUrl: z.string().nullable().optional(),
});

export const locationSchema = z.object({
  country: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  city: z.string().min(2).max(80),
  suburb: z.string().min(1).max(80),
  postcode: z.string().max(20).default(""),
  addressLine1: z.string().min(3).max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Rough Pune metro bounds for soft validation warnings. */
export function isLikelyPune(lat: number, lng: number): boolean {
  return lat >= 18.35 && lat <= 18.75 && lng >= 73.65 && lng <= 74.05;
}

export const businessBasicsSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(20).max(4000),
  categorySlug: z.string().min(1),
  subcategorySlug: z.string().max(80).optional().default(""),
  phone: z.string().min(8).max(30),
  email: z.string().email(),
  website: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => v ?? ""),
  priceLevel: z.number().int().min(1).max(4).nullable(),
  attributes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const onboardingDraftSchema = z.object({
  mode: z.enum(["claim", "create"]),
  claimBusinessId: z.string().uuid().nullable().optional(),
  name: z.string(),
  description: z.string(),
  categorySlug: z.string(),
  currentStep: z.number().int().min(0).max(8).optional(),
});

export const claimCreateSchema = z.object({
  businessId: z.string().uuid(),
  notes: z.string().max(1000).optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
});

export type BusinessBasicsInput = z.infer<typeof businessBasicsSchema>;
