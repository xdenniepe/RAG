import Link from "next/link";

import { OpsDashboardClient } from "@/components/ops-dashboard-client";
import { Button } from "@/components/ui/button";

export default function OpsDashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ops ingestion dashboard
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Ingest wine details, brew stories, and deep product context for reuse.
        </p>
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard">Back to role selector</Link>
        </Button>
      </div>
      <OpsDashboardClient />
    </main>
  );
}
