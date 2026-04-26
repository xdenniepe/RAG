import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardSessionRoleHeader } from "@/components/dashboard-session-role-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOnboardingStatus } from "@/lib/onboarding/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }

  const user = await currentUser();
  const isAdmin = user?.privateMetadata?.role === "admin";
  if (!isAdmin) {
    const onboarding = await getOnboardingStatus(userId);
    if (!onboarding.isCompleted) {
      redirect("/onboarding");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <DashboardSessionRoleHeader />
      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ops dashboard</CardTitle>
            <CardDescription>
              Ingest wine details, producer stories, and detailed background
              data using forms or files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/ops">Go to Ops</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Merchant dashboard</CardTitle>
            <CardDescription>
              Ingest restaurant/menu details and generate marketing copy from
              the combined knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="success" asChild>
              <Link href="/dashboard/merchant">Go to Merchant</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
