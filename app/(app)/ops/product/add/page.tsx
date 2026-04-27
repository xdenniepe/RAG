import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";

export default async function OpsAddProductPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect(ROUTES.auth.signIn);
  }

  const user = await safeCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.postSignIn);
  }

  const isAdmin = user.privateMetadata?.role === "admin";
  if (!isAdmin) {
    const onboarding = await getOnboardingStatus(userId);
    if (!onboarding.isCompleted) {
      redirect(ROUTES.onboarding);
    }
    redirect(ROUTES.dashboard.merchant);
  }

  return (
    <main className="flex-1 w-full max-w-none flex-col gap-6 bg-[#faf9f7] px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <nav>
          <Link
            href={ROUTES.ops.dashboard}
            className="text-sm font-medium text-[var(--muted-foreground)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
          >
            ← Back to Ops dashboard
          </Link>
        </nav>
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Add product
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Individual SKU or offering tied to a producer. Build out this form next.
          </p>
        </header>
      </div>
    </main>
  );
}
