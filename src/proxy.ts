import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path except static assets and PWA files:
     * - _next/static, _next/image
     * - sw.js, manifest.webmanifest, icons, favicon, images
     * - robots.txt, which must answer for crawlers rather than redirect to login
     */
    "/((?!_next/static|_next/image|sw\.js|manifest\.webmanifest|robots\.txt|icons/|favicon\.ico|icon\.png|apple-icon\.png|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)",
  ],
};
