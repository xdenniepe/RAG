import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OpsImportPreviewClient } from "@/components/ops-import-preview-client";
import { Button } from "@/components/ui/button";
import { getOnboardingStatus } from "@/lib/onboarding/server";

type PageProps = {
  params: Promise<{
    draftId: string;
  }>;
};

export default async function OpsImportPreviewPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const onboarding = await getOnboardingStatus(userId);
  if (!onboarding.isCompleted) {
    redirect("/onboarding");
  }

  const { draftId } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Ops import preview</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Review, edit, and remove rows before final import.
        </p>
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard/ops">Back to Ops dashboard</Link>
        </Button>
      </div>
      <OpsImportPreviewClient draftId={draftId} />
    </main>
  );
}
