import { redirect } from "next/navigation";

import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";
import { ProductAddStepSetup } from "./product-add-step-setup";

export default async function OpsAddProductPage() {
  const user = await safeCurrentUser();
  if (!user) {
    redirect(ROUTES.auth.postSignIn);
  }

  const isAdmin = user.privateMetadata?.role === "admin";
  if (!isAdmin) {
    const onboarding = await getOnboardingStatus(user.id);
    if (!onboarding.isCompleted) {
      redirect(ROUTES.onboarding);
    }
    redirect(ROUTES.dashboard.merchant);
  }

  return (
    <div className="space-y-4">
      <ProductAddStepSetup />
      <section className="rounded-xl border border-[var(--input-border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Product form fields will be added here.
        </p>
      </section>
    </div>
  );
}
