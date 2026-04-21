import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/chokaigi(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logged-out",
  "/api/webhooks(.*)",
  "/api/yukkuri-explain",
  "/api/og(.*)",
  "/api/health/db",
  "/yukkuri(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
