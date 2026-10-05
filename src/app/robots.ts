import type { MetadataRoute } from "next";

/**
 * https://app.gettada.me/robots.txt
 *
 * The app is behind a sign-in, and every unknown path renders the login page
 * with a 200 rather than a 404, so without this a crawler can index unlimited
 * duplicate copies of the sign-in screen. Only the three pages that are useful
 * to a signed-out visitor stay open; the marketing site at www.gettada.me is
 * what should rank. The legal pages stay crawlable so their canonical (which
 * points at www) can be read and the two copies consolidate.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/help", "/legal"],
        disallow: "/",
      },
    ],
    host: "https://app.gettada.me",
  };
}
