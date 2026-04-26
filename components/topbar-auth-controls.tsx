"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

export function TopbarAuthControls() {
  const pathname = usePathname();
  const { userId } = useAuth();

  if (pathname === "/auth/sign-up") {
    return null;
  }

  if (userId) {
    return <UserButton />;
  }

  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl="/dashboard"
      fallbackRedirectUrl="/dashboard"
    />
  );
}
