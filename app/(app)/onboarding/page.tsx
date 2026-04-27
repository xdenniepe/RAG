import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { RestaurantOnboardingClient } from "./restaurant-onboarding-client";
import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect(ROUTES.auth.signUp);
  }

  const user = await safeCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.postSignIn);
  }
  const isAdmin = user?.privateMetadata?.role === "admin";
  if (isAdmin) {
    redirect(ROUTES.ops.dashboard);
  }

  const onboarding = await getOnboardingStatus(userId);
  if (onboarding.isCompleted) {
    redirect(ROUTES.dashboard.merchant);
  }

  const isEmailVerified = user?.primaryEmailAddress?.verification?.status === "verified";

  if (!isEmailVerified) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6 py-10">
        <p className="text-sm text-white/90">
          Confirm your email address in Clerk before continuing onboarding.
        </p>
      </main>
    );
  }

  return <RestaurantOnboardingClient />;
}
