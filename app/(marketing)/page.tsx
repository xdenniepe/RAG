import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function MarketingPage() {
  const { userId } = await auth();
  if (userId) {
    redirect("/auth/post-sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 px-6 py-12">
      <Badge className="w-fit bg-white/20 text-white backdrop-blur-sm">
        Tastefari Development
      </Badge>
      <Card className="border-[var(--input-border)] bg-[var(--surface)] shadow-soft">
        <CardContent className="space-y-7 p-7">
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
              Build restaurant wine marketing copy from your own files.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
              Upload docs and images from Ops or Restaurant teams, index them
              with pgvector, then generate a clean marketing-ready wine menu
              copy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link className="text-white" href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
