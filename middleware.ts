import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPrivateRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/ops(.*)",
]);

const isApiRoute = createRouteMatcher([
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPrivateRoute(req)) {
    await auth();
  }

  if (isApiRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
