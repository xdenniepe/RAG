import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { Geist, Geist_Mono } from "next/font/google";
import { TopbarAuthControls } from "@/components/topbar-auth-controls";
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
  if (userId) {
    const user = await currentUser();
    const desiredRole = resolveRoleFromEmail(user?.primaryEmailAddress?.emailAddress);
    const existingRole =
      typeof user?.publicMetadata?.role === "string" ? user.publicMetadata.role : "";

    if (existingRole !== desiredRole) {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...(user?.publicMetadata ?? {}),
          role: desiredRole,
        },
      });
    }
  }

  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-screen flex flex-col">
          <header className="flex items-center justify-end px-6 py-4">
            <TopbarAuthControls />
          </header>
          <main className="flex-1 min-h-0 flex flex-col">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
