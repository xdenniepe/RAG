import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PostSignInResolverClient } from "@/app/auth/post-sign-in/post-sign-in-resolver-client";
import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";

const SSO_RESOLVE_RETRIES = 8;
const SSO_RETRY_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function PostSignInPage() {
  const { userId } = await auth();
  if (!userId) {
    return <PostSignInResolverClient />;
  }

  for (let attempt = 0; attempt < SSO_RESOLVE_RETRIES; attempt += 1) {
    const user = await safeCurrentUser();
    if (user?.privateMetadata?.role === "admin") {
      redirect(ROUTES.ops.dashboard);
    }

    try {
      const onboarding = await getOnboardingStatus(userId);
      redirect(onboarding.isCompleted ? ROUTES.dashboard.merchant : ROUTES.onboarding);
    } catch {
      // Keep retrying for transient SSO/session propagation failures.
    }

    if (attempt < SSO_RESOLVE_RETRIES - 1) {
      await sleep(SSO_RETRY_DELAY_MS);
    }
  }

  return <PostSignInResolverClient />;
}
