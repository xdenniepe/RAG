import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthNavigationGuardClient } from "@/app/auth/auth-navigation-guard-client";
import { AuthSessionSync } from "@/components/auth-session-sync";
import { NavAuthControls } from "@/components/nav-auth-controls";
import { safeCurrentUser } from "@/lib/clerk-user";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tastefari RAG MVP",
  description: "Restaurant wine menu marketing copy powered by RAG.",
};

/** Ensures correct initial scale on phones/tablets; desktop browsers ignore device-width quirks. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function parseCsvSet(value: string | undefined) {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return new Set(items.length > 0 ? items : "");
}

const ADMIN_EMAIL_DOMAINS = parseCsvSet(process.env.ADMIN_EMAIL_DOMAINS);
const ADMIN_EMAILS = parseCsvSet(process.env.ADMIN_EMAILS);

function resolveRoleFromEmail(emailAddress: string | null | undefined) {
  if (!emailAddress) {
    return "merchant";
  }
  const normalizedEmail = emailAddress.toLowerCase();
  if (ADMIN_EMAILS.has(normalizedEmail)) {
    return "admin";
  }
  const domain = normalizedEmail.split("@")[1] ?? "";
  return ADMIN_EMAIL_DOMAINS.has(domain) ? "admin" : "merchant";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  let sessionRole = "";
  let sessionDisplayName = "";
  if (userId) {
    try {
      const user = await safeCurrentUser();
      if (user) {
        const primaryEmailAddress = user.primaryEmailAddress?.emailAddress ?? "";
        sessionDisplayName =
          user.fullName ||
          user.firstName ||
          (primaryEmailAddress.includes("@") ? primaryEmailAddress.split("@")[0] : "") ||
          "Restaurant Name";
        sessionRole =
          typeof user.privateMetadata?.role === "string" ? user.privateMetadata.role : "";
        const desiredRole = resolveRoleFromEmail(user.primaryEmailAddress?.emailAddress);
        const existingRole =
          typeof user.privateMetadata?.role === "string" ? user.privateMetadata.role : "";

        if (existingRole !== desiredRole) {
          const client = await clerkClient();
          await client.users.updateUserMetadata(userId, {
            privateMetadata: {
              ...(user.privateMetadata ?? {}),
              role: desiredRole,
            },
          });
          sessionRole = desiredRole;
        }
      }
    } catch (error) {
      console.error("Failed to sync Clerk role metadata in layout", error);
    }
  }

  return (
    <ClerkProvider ui={ui}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="flex min-h-screen min-w-0 flex-col pb-[env(safe-area-inset-bottom)]">
          <AuthNavigationGuardClient />
          <AuthSessionSync role={sessionRole} displayName={sessionDisplayName} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <NavAuthControls>{children}</NavAuthControls>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
