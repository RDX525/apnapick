import { assertEnv, hasSupabaseConfig } from "@/config/env";
import { appConfig } from "@/config/app";
import { getFeatureFlags } from "@/config/feature-flags";
import { jsonOk } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  const env = assertEnv();
  return jsonOk({
    ok: true,
    service: "apnapick",
    phase: appConfig.phase,
    market: appConfig.market,
    time: new Date().toISOString(),
    supabaseConfigured: hasSupabaseConfig(),
    featureFlags: getFeatureFlags(),
    app: env.public.NEXT_PUBLIC_APP_NAME,
  });
}
