"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export const SESSION_USER_ID_KEY = "tastefari:session:userId";
export const SESSION_ROLE_KEY = "tastefari:session:role";

export const SESSION_UPDATED_EVENT = "tastefari:session-updated";

type AuthSessionSyncProps = {
  role: string;
};

export function AuthSessionSync({ role }: AuthSessionSyncProps) {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      sessionStorage.removeItem(SESSION_USER_ID_KEY);
      sessionStorage.removeItem(SESSION_ROLE_KEY);
      return;
    }

    sessionStorage.setItem(SESSION_USER_ID_KEY, userId);
    sessionStorage.setItem(SESSION_ROLE_KEY, role);
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }, [isLoaded, isSignedIn, role, userId]);

  return null;
}
