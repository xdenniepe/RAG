import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { safeCurrentUser } from "@/lib/clerk-user";

export const dynamic = "force-dynamic";

export default async function AppPrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();
  const user = await safeCurrentUser();

  if (!userId || !user) {
    notFound();
  }

  return children;
}
