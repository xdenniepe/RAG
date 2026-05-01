import { redirect } from "next/navigation";

import { safeCurrentUser } from "@/lib/clerk-user";
import { getOnboardingStatus } from "@/lib/onboarding/server";
import { ROUTES } from "@/lib/routes";
import { OpsEditorStepControls } from "@/app/(app)/ops/(editor)/ops-editor-step-controls";
import { ProducerAddStepSetup } from "./producer-add-step-setup";

export default async function OpsAddProducerPage() {
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
      <ProducerAddStepSetup />
      <section className="rounded-xl border border-[var(--input-border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Producer form fields will be added here.
        </p>
      </section>
      <OpsEditorStepControls lastStepLabel="Continue to Review" />
    </div>
  );
}
