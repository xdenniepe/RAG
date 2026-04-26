import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { RestaurantOnboardingClient } from "@/components/restaurant-onboarding-client";
import { getOnboardingStatus } from "@/lib/onboarding/server";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const onboarding = await getOnboardingStatus(userId);
  if (onboarding.isCompleted) {
    redirect("/dashboard");
  }

  const user = await currentUser();
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
