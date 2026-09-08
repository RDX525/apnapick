import { getPublicEnv, hasSupabaseConfig } from "@/config/env";

export const appConfig = {
  name: "ApnaPick",
  phase: 1 as const,
  market: {
    city: "Pune",
    country: "IN",
    countryName: "India",
    timezone: "Asia/Kolkata",
    locale: "en-IN",
    currency: "INR",
  },
  get defaults() {
    const env = getPublicEnv();
    return {
      city: env.NEXT_PUBLIC_DEFAULT_CITY,
      country: env.NEXT_PUBLIC_DEFAULT_COUNTRY,
      lat: env.NEXT_PUBLIC_DEFAULT_LAT,
      lng: env.NEXT_PUBLIC_DEFAULT_LNG,
      appUrl: env.NEXT_PUBLIC_APP_URL,
      appName: env.NEXT_PUBLIC_APP_NAME,
    };
  },
  get supabaseReady() {
    return hasSupabaseConfig();
  },
} as const;

export type AppConfig = typeof appConfig;
