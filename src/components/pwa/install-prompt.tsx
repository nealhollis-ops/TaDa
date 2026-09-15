"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const noopSubscribe = () => () => {};

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * "Add to Home Screen" helper.
 * - Android/Chrome: shows a real install button once the browser offers it.
 * - iPhone/iPad: shows the Share > Add to Home Screen instructions.
 * - Hidden entirely once the app is already installed.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  // Server renders "installed" (nothing shown); the browser corrects it on hydration.
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => true);
  const isIOS = useSyncExternalStore(noopSubscribe, isIOSDevice, () => false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (standalone) return null;

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className="rounded-full bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
      >
        Add TaDa to your home screen
      </button>
    );
  }

  if (isIOS) {
    return (
      <p className="max-w-xs text-center text-sm text-fade">
        On iPhone: tap the <span className="font-semibold text-ink">Share</span> button in Safari, then{" "}
        <span className="font-semibold text-ink">Add to Home Screen</span>.
      </p>
    );
  }

  return null;
}
