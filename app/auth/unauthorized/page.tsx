import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Unrecognized sign-in attempt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            We detected a sign-in attempt from a device or location that does not
            look familiar. You can stop this by re-authenticating and reviewing
            your active sessions in Clerk.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/auth/sign-in">Secure my account</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
