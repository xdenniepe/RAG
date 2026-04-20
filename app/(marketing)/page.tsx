import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MarketingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center gap-8 px-6 py-12">
      <Badge className="w-fit">RAG MVP - OpenAI first, Clerk later</Badge>
      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight">
              Build restaurant wine marketing copy from your own files.
            </h1>
            <p className="max-w-2xl text-[var(--muted-foreground)]">
              Upload docs and images from Ops or Restaurant teams, index them
              with pgvector, then generate a clean marketing-ready wine menu
              copy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">Open role dashboard</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard/ops">Ops ingestion</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
