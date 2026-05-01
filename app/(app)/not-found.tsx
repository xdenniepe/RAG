import { auth } from "@clerk/nextjs/server";

import { NotFoundView } from "@/components/not-found-view";
import { ROUTES } from "@/lib/routes";

export default async function AppNotFound() {
  const { userId } = await auth();
  const isUnauthenticated = !userId;

  return (
    <NotFoundView
      title="Private page not found"
      description={
        isUnauthenticated
          ? "You need to sign in before accessing private pages."
          : "This private page does not exist."
      }
      ctaHref={isUnauthenticated ? ROUTES.auth.signIn : ROUTES.dashboard.root}
      ctaLabel={isUnauthenticated ? "Go to login" : "Go to dashboard"}
    />
  );
}
