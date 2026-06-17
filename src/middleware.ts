import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Ticket 0003 — every request runs through updateSession, which:
//   1. Refreshes the Supabase auth cookies (if any),
//   2. Decides whether the requested path is in the public allowlist,
//   3. Either passes through or 302s to /auth/signin?next=<requested>.
//
// The matcher excludes static assets, the Next image optimizer, and the
// favicon — auth gating on those serves no purpose and breaks PWA install
// surfaces. The Supabase / Vercel reference matcher (per Supabase's App
// Router quickstart) is reused here verbatim, plus an explicit carve-out
// for the PWA manifest + service worker.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *  - _next/static (static files)
     *  - _next/image (image optimization files)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - PWA assets that must be reachable pre-auth (manifest, sw, icons)
     *  - any path with a file extension (covers og images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js|map)).*)",
  ],
};
