import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv, supabaseConfigured } from "@/lib/env";

/** Paths that never require a session. Everything else under the app does. */
const PUBLIC_PATHS = ["/login", "/auth", "/offline", "/api", "/manifest.webmanifest", "/sw.js", "/icons", "/legal"];
// /api routes check the session themselves and answer 401 instead of redirecting.

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Runs on every matched request (see src/proxy.ts):
 *  1. refreshes the Supabase session and keeps auth cookies in sync
 *  2. sends signed-out visitors on protected paths to /login (remembering where they were going)
 *  3. sends signed-in visitors away from /login
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseConfigured) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not remove: getUser() is what actually refreshes an expiring session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
