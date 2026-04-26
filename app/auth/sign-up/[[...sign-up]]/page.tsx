"use client";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function SignUpPage() {
  const pathname = usePathname();
  const showClerkHeader = pathname === "/auth/sign-up/verify-email-address";

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6">
        <header className="space-y-2 text-center">
          <h1 className="flex items-center justify-center -ml-2 text-3xl font-semibold tracking-tight text-white">
            <Image
              src="/assets/logo.png"
              alt="Tastefari logo"
              width={44}
              height={44}
              className="size-20 object-contain"
            />
            <span className="text-4xl font-bold tracking-tight text-white">Tastefari</span>
          </h1>
          <p className="pt-1 text-base font-medium text-[var(--onboarding-hero-subtitle)]">
            {showClerkHeader
              ? "Enter the verification code sent to your email"
              : "Create premium product experiences for your guests"}
          </p>
        </header>

        <div className="mx-auto flex w-full max-w-2xl items-center justify-center">
          <div
            className="signup-card-cleanup w-full max-w-4xl"
          >
            <SignUp
              path="/auth/sign-up"
              routing="path"
              signInUrl="/auth/sign-in"
              forceRedirectUrl="/auth/post-sign-in"
              fallbackRedirectUrl="/auth/post-sign-in"
              appearance={{
                elements: {
                  rootBox: "w-full max-w-2xl",
                  cardBox: "w-full max-w-2xl",
                  card: "w-full rounded-xl border border-[var(--input-border)] bg-[var(--surface)] p-6 pt-6 shadow-soft backdrop-blur-md",
                  header: showClerkHeader ? "" : "hidden",
                  socialButtonsBlockButton:
                    "border border-[var(--input-border)] bg-[var(--input-background)] text-[var(--foreground)]",
                  socialButtonsBlockButtonText: "text-[var(--foreground)]",
                  formFieldInput:
                    "flex h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-background)] px-3 py-2 text-sm text-[var(--control-foreground)] shadow-sm transition-colors placeholder:text-[var(--muted-foreground)] hover:border-[var(--input-border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50",
                  formFieldLabel: "text-sm font-medium leading-none text-[var(--foreground)]",
                  formButtonPrimary:
                    "inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl bg-[var(--link)] px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 ring-offset-[var(--surface)] disabled:pointer-events-none disabled:opacity-50",
                  footerActionLink: "text-[var(--link)]",
                },
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
