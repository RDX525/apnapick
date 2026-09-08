import { z } from "zod";

export const reviewRatingSchema = z.number().int().min(1).max(5);

export const createReviewSchema = z.object({
  businessId: z.string().uuid(),
  rating: reviewRatingSchema,
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  body: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const updateReviewSchema = z.object({
  rating: reviewRatingSchema.optional(),
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
  body: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null)),
});

export const replyReviewSchema = z.object({
  replyBody: z.string().trim().min(1).max(2000),
});

export const reportReviewSchema = z.object({
  reason: z.enum(["spam", "abuse", "off_topic", "fake", "other"]),
  details: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN", "REJECTED", "PENDING"]),
  note: z.string().trim().max(500).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
