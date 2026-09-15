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
     */
    "/((?!_next/static|_next/image|sw\.js|manifest\.webmanifest|icons/|favicon\.ico|icon\.png|apple-icon\.png|.*\.(?:svg|png|jpg|jpeg|gif|webp|mp3|mp4)$).*)",
  ],
};
