import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your dashboard
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Separate flows for Ops and Restaurant merchants.
        </p>
      </div>
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
