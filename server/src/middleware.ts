import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/chokaigi(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logged-out",
  "/api/webhooks(.*)",
  "/api/clerk-proxy(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // clerk-proxy は Clerk ミドルウェアを経由させない（FAPI 到達不能で 500 になるため）
    "/((?!_next|api/clerk-proxy|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/clerk-proxy)|trpc)(.*)",
  ],
};
