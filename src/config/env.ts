import { z } from "zod";

/**
 * Public env — safe to expose to the browser (NEXT_PUBLIC_* only).
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("ApnaPick"),
  NEXT_PUBLIC_DEFAULT_CITY: z.string().min(1).default("Pune"),
  NEXT_PUBLIC_DEFAULT_COUNTRY: z.string().length(2).default("IN"),
  NEXT_PUBLIC_DEFAULT_LAT: z.coerce.number().min(-90).max(90).default(18.551),
  NEXT_PUBLIC_DEFAULT_LNG: z.coerce.number().min(-180).max(180).default(73.94),
  NEXT_PUBLIC_SUPABASE_URL: z.union([z.string().url(), z.literal("")]).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

/**
 * Server-only env — never import this module from Client Components.
 */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SEARCH_DEFAULT_RADIUS_M: z.coerce.number().int().min(100).max(50000).default(8000),
  RATE_LIMIT_REDIS_URL: z.union([z.string().url(), z.literal("")]).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  FEATURE_FLAGS_JSON: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_PREMIUM: z.string().optional(),
  RAZORPAY_PLAN_BUSINESS: z.string().optional(),
  SENTRY_DSN: z.union([z.string().url(), z.literal("")]).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readPublicRaw() {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_DEFAULT_CITY: process.env.NEXT_PUBLIC_DEFAULT_CITY,
    NEXT_PUBLIC_DEFAULT_COUNTRY: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY,
    NEXT_PUBLIC_DEFAULT_LAT: process.env.NEXT_PUBLIC_DEFAULT_LAT,
    NEXT_PUBLIC_DEFAULT_LNG: process.env.NEXT_PUBLIC_DEFAULT_LNG,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
  };
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse(readPublicRaw());
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SEARCH_DEFAULT_RADIUS_M: process.env.SEARCH_DEFAULT_RADIUS_M,
    RATE_LIMIT_REDIS_URL: process.env.RATE_LIMIT_REDIS_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    FEATURE_FLAGS_JSON: process.env.FEATURE_FLAGS_JSON,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_PLAN_PREMIUM: process.env.RAZORPAY_PLAN_PREMIUM,
    RAZORPAY_PLAN_BUSINESS: process.env.RAZORPAY_PLAN_BUSINESS,
    SENTRY_DSN: process.env.SENTRY_DSN,
  });
}

/** Validate public + server env at boot (server contexts only). */
export function assertEnv(): { public: PublicEnv; server: ServerEnv } {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  return { public: publicEnv, server: serverEnv };
}

export function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes("YOUR_PROJECT") &&
    key !== "your-anon-key" &&
    url.length > 0,
  );
}

export function readServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^["']|["']$/g, "");
  if (!key || key === "your-service-role-key") return null;
  return key;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(readServiceRoleKey());
}

/** Test-only auth bypass; production can never enable this path. */
export function isE2EAuthBypass(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_BYPASS_AUTH === "true"
  );
}
