import { jsonError, jsonOk } from "@/lib/api/response";
import { listPlans } from "@/services/billing/subscription-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await listPlans();
    return jsonOk({
      plans,
      note: "Organic search ranking is never affected by plan. Sponsored slots are separate and labeled.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
