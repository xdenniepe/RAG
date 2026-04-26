"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

type OnboardingResponse = {
  profile?: {
    isCompleted?: boolean;
  };
};

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 300;

export function PostSignInResolverClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [status] = useState("Checking your account...");

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.replace("/auth/sign-in");
      return;
    }

    let cancelled = false;
    let retries = 0;

    const resolveDestination = async () => {
      try {
        const response = await fetch("/api/onboarding", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store",
          },
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as OnboardingResponse;
          router.replace(payload.profile?.isCompleted ? "/dashboard" : "/onboarding");
          return;
        }

        if ((response.status === 401 || response.status === 403) && retries < MAX_RETRIES) {
          retries += 1;
          window.setTimeout(() => {
            void resolveDestination();
          }, RETRY_DELAY_MS);
          return;
        }

        router.replace("/onboarding");
      } catch {
        if (cancelled) {
          return;
        }
        if (retries < MAX_RETRIES) {
          retries += 1;
          window.setTimeout(() => {
            void resolveDestination();
          }, RETRY_DELAY_MS);
          return;
        }
        router.replace("/onboarding");
      }
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6 py-10">
      <p className="text-sm text-white/90">{status}</p>
    </main>
  );
}
