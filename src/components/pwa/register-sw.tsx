"use client";

import { useEffect } from "react";

/** Registers /sw.js once the page has loaded. Renders nothing. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => console.warn("Service worker registration failed", err));
  }, []);
  return null;
}
