import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PostSignInResolverClient } from "@/app/auth/post-sign-in/post-sign-in-resolver-client";
import { getOnboardingStatus } from "@/lib/onboarding/server";

export default async function PostSignInPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const user = await currentUser();
  if (user?.privateMetadata?.role === "admin") {
    redirect("/dashboard");
  }

  try {
    const onboarding = await getOnboardingStatus(userId);
    redirect(onboarding.isCompleted ? "/dashboard" : "/onboarding");
  } catch {
    // Keep a client-side fallback for transient auth/session propagation cases.
  }

  return <PostSignInResolverClient />;
}
