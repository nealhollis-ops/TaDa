"use client";

import { publicEnv } from "@/lib/env";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/**
 * Ask for permission (if not yet decided) and register this device for push.
 * Safe to call repeatedly; it re-saves the subscription so the server stays current.
 */
export async function enablePush(): Promise<"granted" | "denied" | "unsupported"> {
  if (!pushSupported() || !publicEnv.vapidPublicKey) return "unsupported";
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) }));
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: JSON.parse(JSON.stringify(sub)), userAgent: navigator.userAgent }),
    });
    return "granted";
  } catch {
    return "denied";
  }
}

export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
  } catch {
    /* fine */
  }
}
