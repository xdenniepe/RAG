import { redirect } from "next/navigation";

import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";

export default async function DashboardPage() {
  const user = await safeCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.postSignIn);
  }

  const isAdmin = user.privateMetadata?.role === "admin";
  if (isAdmin) {
    redirect(ROUTES.ops.dashboard);
  }

  const onboarding = await getOnboardingStatus(user.id);
  if (!onboarding.isCompleted) {
    redirect(ROUTES.onboarding);
  }

  return (
    <main className="flex-1 w-full max-w-none flex-col gap-8 bg-[var(--page-canvas)] px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Welcome back to your restaurant portal
        </p>
      </div>
    </main>
  );
}
