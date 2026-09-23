/**
 * Holds the browser's "install this app" offer so any screen can use it.
 * Android fires `beforeinstallprompt` once, early in the page load, long before the
 * member reaches Account. InstallCapture (mounted in the app layout) stashes it here.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((fn) => fn());

export function startInstallCapture() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  // The inline script in the root layout listens from the first moment of the
  // page; adopt anything it already caught.
  const early = (window as Window & { __tadaInstallOffer?: BeforeInstallPromptEvent | null }).__tadaInstallOffer;
  if (early) {
    deferred = early;
    notify();
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    (window as Window & { __tadaInstallOffer?: BeforeInstallPromptEvent | null }).__tadaInstallOffer = null;
    notify();
  });
}

export function subscribeInstall(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const getInstallOffer = () => deferred;

export async function runInstall() {
  const offer = deferred;
  if (!offer) return "unavailable" as const;
  await offer.prompt();
  const { outcome } = await offer.userChoice;
  // An offer can only be used once, whatever they chose.
  deferred = null;
  (window as Window & { __tadaInstallOffer?: BeforeInstallPromptEvent | null }).__tadaInstallOffer = null;
  notify();
  return outcome;
}

export function isStandalone() {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}
