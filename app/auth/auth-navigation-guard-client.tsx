"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

function isSignInPath(pathname: string) {
  return pathname === "/auth/sign-in" || pathname.startsWith("/auth/sign-in/");
}

function isSignUpPath(pathname: string) {
  return pathname === "/auth/sign-up" || pathname.startsWith("/auth/sign-up/");
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith(ROUTES.dashboard.root) ||
    pathname.startsWith(ROUTES.ops.root) ||
    pathname.startsWith(ROUTES.onboarding)
  );
}

export function AuthNavigationGuardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      if (pathname === "/" || isSignInPath(pathname) || isSignUpPath(pathname)) {
        router.replace(ROUTES.auth.postSignIn);
      }
      return;
    }

    if (pathname === ROUTES.auth.postSignIn || isProtectedPath(pathname)) {
      router.replace(ROUTES.auth.signIn);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
