# ApnaPick Environment

Copy `.env.example` to `.env.local`.

## Public (`NEXT_PUBLIC_*`)

Safe for the browser. Validated by `publicEnvSchema` in `src/config/env.ts`.

| Variable                          | Purpose                 | Default                 |
| --------------------------------- | ----------------------- | ----------------------- |
| `NEXT_PUBLIC_APP_URL`             | Canonical site URL      | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME`            | Product name            | `ApnaPick`              |
| `NEXT_PUBLIC_DEFAULT_CITY`        | Launch city             | `Pune`                  |
| `NEXT_PUBLIC_DEFAULT_COUNTRY`     | ISO country             | `IN`                    |
| `NEXT_PUBLIC_DEFAULT_LAT` / `LNG` | Default map center      | Pune                    |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project        | optional                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon key       | optional                |
| `NEXT_PUBLIC_ENABLE_ANALYTICS`    | Enable analytics client | `false`                 |

## Server-only

Never import into Client Components. Validated by `serverEnvSchema`.

| Variable                    | Purpose                                |
| --------------------------- | -------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase access             |
| `SEARCH_DEFAULT_RADIUS_M`   | Default geo radius                     |
| `LOG_LEVEL`                 | `debug` \| `info` \| `warn` \| `error` |
| `RATE_LIMIT_REDIS_URL`      | Redis/Upstash URL for multi-instance rate limits |
| `FEATURE_FLAGS_JSON`        | JSON overrides for feature flags       |
| `RAZORPAY_KEY_ID`           | Razorpay key id                        |
| `RAZORPAY_KEY_SECRET`       | Razorpay key secret                    |
| `RAZORPAY_WEBHOOK_SECRET`   | Razorpay webhook HMAC secret           |
| `RAZORPAY_PLAN_PREMIUM`     | Razorpay Plan id for Premium           |
| `RAZORPAY_PLAN_BUSINESS`    | Razorpay Plan id for Business          |
| `SENTRY_DSN`                | Optional Sentry DSN for server errors  |

## Rules

1. Never commit `.env.local` or secrets.
2. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
3. Call `assertEnv()` in server boot / health paths.
