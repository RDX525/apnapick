import { z } from "zod";

export const reviewRatingSchema = z.number().int().min(1).max(5);

const optionalPublicDisplayName = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : null));

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
  /** Public name shown on the review — never the account email */
  displayName: optionalPublicDisplayName,
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
  displayName: optionalPublicDisplayName,
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

export const moderateReviewSchema = z
  .object({
    action: z.enum(["approve", "reject", "request_verification"]).optional(),
    status: z.enum(["PUBLISHED", "HIDDEN", "REJECTED", "PENDING"]).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => Boolean(value.action || value.status), {
    message: "Provide action or status",
  });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
