import Link from "next/link";

import { MerchantDashboardClient } from "@/components/merchant-dashboard-client";
import { Button } from "@/components/ui/button";

export default function MerchantDashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Merchant dashboard
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Ingest restaurant data and generate marketing copy using merchant + ops context.
        </p>
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dashboard">Back to role selector</Link>
        </Button>
      </div>
      <MerchantDashboardClient />
    </main>
  );
}
