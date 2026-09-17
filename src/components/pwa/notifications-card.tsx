"use client";

import { useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { C } from "@/components/planner/ui";
import { isIOSDevice, isStandalone } from "@/lib/pwa/install";

const noop = () => () => {};

type DeviceState = "ready" | "blocked" | "ask" | "needs-install" | "unsupported";

function deviceState(): DeviceState {
  if (typeof window === "undefined") return "ask";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return isIOSDevice() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "granted") return "ready";
  if (Notification.permission === "denied") return "blocked";
  return "ask";
}

/** The Notifications switch on Account, with a plain list of what it sends and where this device stands. */
export function NotificationsCard({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const state = useSyncExternalStore(noop, deviceState, () => "ask" as DeviceState);
  const status = !on
    ? { text: "Off. Nothing is sent to any of your devices.", color: C.fade }
    : state === "ready"
      ? { text: "On, and this device is set up to receive them.", color: C.teal }
      : state === "blocked"
        ? { text: "On, but this browser has blocked notifications. Allow them in the browser\u2019s site settings to get alerts here.", color: C.coral }
        : state === "needs-install"
          ? { text: "On. iPhones only deliver notifications once TaDa is installed to the home screen. See Install TaDa below.", color: C.goldDeep }
          : state === "unsupported"
            ? { text: "On, but this browser cannot receive notifications. Your other devices still will.", color: C.fade }
            : { text: "On. This device will ask for permission the first time it needs it.", color: C.fade };

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.navy2 }}>
          <Bell size={14} /> Notifications
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          className="relative h-6 w-11 rounded-full transition"
          style={{ background: on ? C.teal : C.line }}
          aria-label="Notifications"
        >
          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
        </button>
      </div>
      <p className="text-xs" style={{ color: C.fade }}>
        A short alert on your phone or computer when something needs you:
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs" style={{ color: C.ink }}>
        <li>a new direct message from a partner or teammate</li>
        <li>someone asks to be your accountability partner</li>
        <li>an invitation to a team</li>
        <li>work assigned to you by a boss</li>
        <li>the occasional announcement from the TaDa team</li>
      </ul>
      <p className="mt-2 text-xs font-medium" style={{ color: status.color }}>
        {status.text}
      </p>
    </div>
  );
}
