import { assertEnv, hasSupabaseConfig } from "@/config/env";
import { appConfig } from "@/config/app";
import { jsonOk } from "@/lib/api/response";
import { createPublicSupabaseClient } from "@/lib/db/supabase-public";
import { createLogger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

const log = createLogger({ module: "health" });

type CheckStatus = "ok" | "error" | "skipped";

async function pingSupabase(): Promise<CheckStatus> {
  if (!hasSupabaseConfig()) return "skipped";
  const supabase = createPublicSupabaseClient();
  if (!supabase) return "error";
  try {
    const { error } = await supabase.from("categories").select("id").limit(1);
    if (error) {
      log.warn("health_supabase_failed", { message: error.message });
      return "error";
    }
    return "ok";
  } catch (error) {
    log.warn("health_supabase_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return "error";
  }
}

export async function GET() {
  const env = assertEnv();
  const supabase = await pingSupabase();
  const ok = supabase !== "error";
  const production = process.env.NODE_ENV === "production";

  return jsonOk(
    {
      ok,
      service: "apnapick",
      phase: appConfig.phase,
      market: appConfig.market,
      time: new Date().toISOString(),
      supabase,
      app: env.public.NEXT_PUBLIC_APP_NAME,
    },
    { status: !ok && production ? 503 : 200 },
  );
}
