import type { createServerSupabaseClient } from "@/lib/db/supabase-server";

type SupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>;

type DraftWriteError = {
  code?: string;
  message: string;
};

function isUniqueViolation(error: DraftWriteError) {
  return (
    error.code === "23505" ||
    error.message.includes("onboarding_drafts_user_active_uidx")
  );
}

/**
 * Updates the user's partial-indexed active draft, inserting only when none exists.
 * A second update closes the first-save race between concurrent autosave requests.
 */
export async function saveActiveOnboardingDraft(
  supabase: SupabaseClient,
  input: {
    userId: string;
    currentStep: number;
    payload: unknown;
  },
): Promise<DraftWriteError | null> {
  const values = {
    current_step: input.currentStep,
    payload: input.payload,
  };

  const { data: updated, error: updateError } = await supabase
    .from("onboarding_drafts")
    .update(values)
    .eq("user_id", input.userId)
    .is("business_id", null)
    .select("id");

  if (updateError) return updateError;
  if (updated && updated.length > 0) return null;

  const { error: insertError } = await supabase.from("onboarding_drafts").insert({
    user_id: input.userId,
    business_id: null,
    ...values,
  });

  if (!insertError) return null;
  if (!isUniqueViolation(insertError)) return insertError;

  const { data: retried, error: retryError } = await supabase
    .from("onboarding_drafts")
    .update(values)
    .eq("user_id", input.userId)
    .is("business_id", null)
    .select("id");

  if (retryError) return retryError;
  if (retried && retried.length > 0) return null;
  return insertError;
}
