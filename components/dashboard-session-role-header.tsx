"use client";

import { useCallback, useEffect, useState } from "react";

import { SESSION_ROLE_KEY, SESSION_UPDATED_EVENT } from "@/components/auth-session-sync";

function readRoleFromSession(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return sessionStorage.getItem(SESSION_ROLE_KEY) ?? "";
}

export function DashboardSessionRoleHeader() {
  const [role, setRole] = useState("");

  const refresh = useCallback(() => {
    setRole(readRoleFromSession());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(SESSION_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-semibold tracking-tight">Choose your dashboard</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Separate flows for Ops and Restaurant merchants.
        {role ? (
          <>
            {" "}
            <span className="text-[var(--foreground)]">Signed in as</span>{" "}
            <span className="font-medium capitalize text-[var(--foreground)]">{role}</span>
            <span className="text-[var(--muted-foreground)]">.</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
