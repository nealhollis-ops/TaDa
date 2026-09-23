"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { C } from "@/components/planner/ui";
import { isIOSDevice, isStandalone } from "@/lib/pwa/install";
import { deviceRegistered } from "@/lib/data/push";

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
export function NotificationsCard({ on, onToggle, communityOn, onToggleCommunity, onEnableDevice }: { on: boolean; onToggle: () => void; communityOn: boolean; onToggleCommunity: () => void; onEnableDevice: () => Promise<"granted" | "denied" | "unsupported"> }) {
  const state = useSyncExternalStore(noop, deviceState, () => "ask" as DeviceState);
  // Permission granted is not the same as registered: this device can be missing
  // a subscription even when the account switch has been on for weeks.
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [asking, setAsking] = useState(false);
  const check = useCallback(() => void deviceRegistered().then(setRegistered), []);
  useEffect(() => check(), [check, on]);

  const ask = async () => {
    setAsking(true);
    await onEnableDevice();
    check();
    setAsking(false);
  };

  // Only claim this device is set up when it truly holds a subscription.
  const ready = state === "ready" && registered === true;
  const needsDevice = on && registered === false && (state === "ask" || state === "ready");

  const status = !on
    ? { text: "Off. Nothing is sent to any of your devices.", color: C.fade }
    : ready
      ? { text: "On, and this device is set up to receive them.", color: C.teal }
      : state === "blocked"
        ? { text: "On, but this browser has blocked notifications. Allow them in the browser\u2019s site settings to get alerts here.", color: C.coral }
        : state === "needs-install"
          ? { text: "On. iPhones only deliver notifications once TaDa is installed to the home screen. See Install TaDa below.", color: C.goldDeep }
          : state === "unsupported"
            ? { text: "On, but this browser cannot receive notifications. Your other devices still will.", color: C.fade }
            : needsDevice
              ? { text: "On for your account, but this device is not set up yet, so nothing will ring here.", color: C.goldDeep }
              : { text: "On. Checking this device...", color: C.fade };

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
        <li>a badge or level you earned</li>
        <li>the occasional announcement from the TaDa team</li>
        <li>replies to your community posts, and @mentions (see below)</li>
      </ul>
      <p className="mt-2 text-xs font-medium" style={{ color: status.color }}>
        {status.text}
      </p>
      {needsDevice && (
        <button
          type="button"
          onClick={() => void ask()}
          disabled={asking}
          className="mt-2 w-full rounded-xl py-2 text-xs font-semibold"
          style={{ background: C.navy, color: C.cream, opacity: asking ? 0.6 : 1 }}
        >
          {asking ? "Setting up..." : "Turn on for this device"}
        </button>
      )}
      <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: C.line }}>
        <div className="pr-3">
          <div className="text-xs font-semibold" style={{ color: C.ink }}>
            From the community
          </div>
          <div className="text-xs" style={{ color: C.fade }}>
            Replies to your posts and @mentions. Turn this off to keep community chatter out of your alerts and your bell; everything else above still comes through.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={communityOn}
          onClick={onToggleCommunity}
          className="relative h-6 w-11 shrink-0 rounded-full transition"
          style={{ background: communityOn ? C.teal : C.line }}
          aria-label="Community notifications"
        >
          <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: communityOn ? 22 : 2 }} />
        </button>
      </div>
    </div>
  );
}
