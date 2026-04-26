import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type OnboardingStatus = {
  isCompleted: boolean;
};

export async function getOnboardingStatus(merchantId: string): Promise<OnboardingStatus> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("onboarding_completed_at")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load onboarding status: ${error.message}`);
  }

  return {
    isCompleted: Boolean(data?.onboarding_completed_at),
  };
}
