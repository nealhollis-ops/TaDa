import "server-only";

import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * The origin the current request came in on (e.g. http://localhost:3000 in dev,
 * https://app.gettada.me in production). Used to build email links and redirects
 * so local testing never bounces to the live site. Falls back to NEXT_PUBLIC_APP_URL.
 */
export async function requestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return publicEnv.appUrl;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return publicEnv.appUrl;
  }
}
