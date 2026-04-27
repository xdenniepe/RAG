"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function MarketingSignedInRedirectClient() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    router.replace("/auth/post-sign-in");
  }, [isLoaded, isSignedIn, router]);

  return null;
}
