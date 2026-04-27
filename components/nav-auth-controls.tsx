"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { BarChart3, Box, Grid2x2, ImageIcon } from "lucide-react";

import { SESSION_DISPLAY_NAME_KEY, SESSION_UPDATED_EVENT } from "@/components/auth-session-sync";
import {
  NAV_AUTH_CONTROLS_HIDDEN_ROUTES,
  NAV_AUTH_CONTROLS_HIDDEN_ROUTE_PREFIXES,
  ROUTES,
  SIDEBAR_NAV_ITEMS,
} from "@/lib/routes";

type NavAuthControlsProps = {
  children: ReactNode;
};

export function NavAuthControls({ children }: NavAuthControlsProps) {
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth();
  const [sessionDisplayName, setSessionDisplayName] = useState("Restaurant Name");
  const hiddenUserButtonContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldHideNavAuthControls =
    NAV_AUTH_CONTROLS_HIDDEN_ROUTES.includes(pathname as (typeof NAV_AUTH_CONTROLS_HIDDEN_ROUTES)[number]) ||
    NAV_AUTH_CONTROLS_HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isInternalOpsRoute =
    pathname === ROUTES.ops.root || pathname.startsWith(`${ROUTES.ops.root}/`);
  const iconByKey = {
    grid: Grid2x2,
    box: Box,
    image: ImageIcon,
    chart: BarChart3,
  } as const;

  const refreshSessionDisplayName = useCallback(() => {
    const storedDisplayName = sessionStorage.getItem(SESSION_DISPLAY_NAME_KEY)?.trim() ?? "";
    setSessionDisplayName(storedDisplayName || "Restaurant Name");
  }, []);

  useEffect(() => {
    refreshSessionDisplayName();
    window.addEventListener(SESSION_UPDATED_EVENT, refreshSessionDisplayName);
    window.addEventListener("storage", refreshSessionDisplayName);
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, refreshSessionDisplayName);
      window.removeEventListener("storage", refreshSessionDisplayName);
    };
  }, [refreshSessionDisplayName]);

  const openUserButtonMenu = useCallback(() => {
    hiddenUserButtonContainerRef.current?.querySelector("button")?.click();
  }, []);

  if (shouldHideNavAuthControls) {
    return <>{children}</>;
  }

  if (isInternalOpsRoute) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="w-full bg-[var(--link)] text-white">
          <div className="container mx-auto max-w-7xl flex w-full min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2 md:py-6">
            <div className="flex min-w-0 items-start gap-2 sm:items-center">
              <Image
                src="/assets/logo.png"
                alt="Tastefari logo"
                width={44}
                height={44}
                className="size-10 shrink-0 object-contain md:size-12"
              />
              <div className="min-w-0 space-y-1 md:space-y-2">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Tastefari Operations</h1>
                <p className="text-sm text-white/80 md:text-base">
                  Internal dashboard for product and restaurant management
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:gap-3">
              <Link
                href={ROUTES.dashboard.merchant}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-white/35 px-3 text-xs font-medium text-white transition hover:bg-white/10 md:h-10 md:px-4 md:text-sm"
              >
                View Restaurant Portal
              </Link>
              {!isLoaded ? (
                <div className="size-8 shrink-0 rounded-full border border-white/25" aria-hidden />
              ) : userId ? (
                <UserButton
                  showName={false}
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "size-9 md:size-10",
                      userButtonBox:
                        "shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[var(--link)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                    },
                  }}
                />
              ) : (
                <Link
                  href={ROUTES.auth.signIn}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-white/35 px-3 text-xs font-medium text-white transition hover:bg-white/10 md:h-10 md:px-4 md:text-sm"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col justify-between border-b border-white/10 bg-[var(--background)] px-3 py-5 text-white md:px-4 md:py-7 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="space-y-6 md:space-y-10">
          <div className="flex items-center gap-1">
            <Image
              src="/assets/logo.png"
              alt="Tastefari logo"
              width={44}
              height={44}
              className="size-12 object-contain md:size-16"
            />
            <div className="space-y-0.5 md:space-y-1">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">Tastefari</h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                Restaurant Portal
              </p>
            </div>
          </div>

          <nav className="space-y-0.5 md:space-y-1">
            {SIDEBAR_NAV_ITEMS.map((item) => {
              const Icon = iconByKey[item.icon];
              const isActive = item.key === "dashboard";

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={
                    isActive
                      ? "flex items-center gap-2.5 rounded-lg px-3 py-2 bg-[var(--sidebar-nav-active)] text-sm text-white shadow-lg shadow-black/30 md:gap-3 md:px-4 md:py-2.5 md:text-base"
                      : "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/90 transition hover:bg-white/10 md:gap-3 md:px-4 md:py-2.5 md:text-base"
                  }
                >
                  <Icon className="size-4 md:size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-[#8b15ff]/50">
          <div className="space-y-3 px-2 pt-3 md:space-y-4 md:px-3 md:pt-4">
            {!isLoaded ? (
              <div className="h-16 w-full rounded-lg border border-white/20" />
            ) : userId ? (
              <button
                type="button"
                onClick={openUserButtonMenu}
                className="flex w-full items-center gap-3 rounded-lg px-1 text-left text-white transition hover:bg-white/10"
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-[#b486ff] text-sm font-semibold text-white md:size-10 md:text-base">
                  {sessionDisplayName.charAt(0)}
                </span>
                <span className="min-w-0 py-0.5 md:py-1">
                  <span className="block truncate text-xs font-semibold md:text-sm">{sessionDisplayName}</span>
                  <span className="block text-[11px] font-semibold text-white/80 md:text-xs">View Profile</span>
                </span>
              </button>
            ) : (
              <Link
                href={ROUTES.auth.signIn}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/35 px-3 text-xs font-medium text-white transition hover:bg-white/10 md:h-11 md:px-4 md:text-sm"
              >
                Sign in
              </Link>
            )}
            {userId ? (
              <div ref={hiddenUserButtonContainerRef} className="sr-only">
                <UserButton />
              </div>
            ) : null}
          </div>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
