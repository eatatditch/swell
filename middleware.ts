import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  // Public catering inquiry forms + their submission endpoint, plus the
  // embed loader served from /embed.js. These have to be reachable without
  // a Supabase session for the marketing site to embed them.
  "/f",
  "/api/forms",
  "/embed.js",
  // Stripe webhook receives unauth POSTs signed with the webhook secret.
  "/api/webhooks",
  // Vercel cron endpoints — invoked by the platform with no Supabase
  // cookie. Auth is enforced inside the route handler via x-vercel-cron
  // header / CRON_SECRET bearer.
  "/api/cron",
  // Public quote acceptance pages + their accept / decline endpoints.
  // Auth is the unguessable accept_token in the URL.
  "/q",
  "/api/quotes",
  // Google Pub/Sub pushes Gmail change notifications here with an OIDC
  // bearer. Auth is enforced inside the route via JWKS verification.
  "/api/integrations",
];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  );
}

function redirectToLogin(request: NextRequest) {
  const url = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") {
    url.searchParams.set("next", request.nextUrl.pathname);
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // No Supabase env. Let public paths through so the login page can
  // render the setup banner. Bounce protected paths to /login so the
  // user lands on the same page with context.
  if (!isSupabaseConfigured()) {
    return isPublic(pathname) ? NextResponse.next() : redirectToLogin(request);
  }

  try {
    const { response, user } = await updateSession(request);

    if (isPublic(pathname)) {
      if (user && pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return response;
    }

    if (!user) {
      return redirectToLogin(request);
    }

    return response;
  } catch (err) {
    // Never let middleware throw on Vercel — it surfaces as
    // MIDDLEWARE_INVOCATION_FAILED 500 and breaks every route.
    console.error("[swell] middleware error:", err);
    return isPublic(pathname) ? NextResponse.next() : redirectToLogin(request);
  }
}

export const config = {
  matcher: [
    /*
     * Match every request except for:
     *   - _next/static
     *   - _next/image
     *   - assets with file extensions (svg, png, etc.)
     */
    "/((?!_next/static|_next/image|.*\\..*).*)",
  ],
};
