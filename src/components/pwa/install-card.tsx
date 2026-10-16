"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { C } from "@/components/planner/ui";
import { getInstallOffer, isAndroidDevice, isIOSDevice, isSamsungInternet, isStandalone, runInstall, startInstallCapture, subscribeInstall } from "@/lib/pwa/install";

const noop = () => () => {};

/** Mount once near the app root so the browser's install offer is caught before any screen needs it. */
export function InstallCapture() {
  useEffect(() => {
    startInstallCapture();
  }, []);
  return null;
}

/**
 * "Install TaDa on this phone" card for the Account screen.
 * Hidden when the app is already running installed. On Android it triggers the real
 * install prompt when the browser offers one, otherwise it explains the menu route.
 */
export function InstallCard() {
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  const offer = useSyncExternalStore(subscribeInstall, getInstallOffer, () => null);
  const ios = useSyncExternalStore(noop, isIOSDevice, () => false);
  const android = useSyncExternalStore(noop, isAndroidDevice, () => false);
  const samsung = useSyncExternalStore(noop, isSamsungInternet, () => false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const addr = useSyncExternalStore(noop, () => `${window.location.host}/account`, () => "");

  if (standalone) return null;

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold" style={{ color: C.navy2 }}>
        <Smartphone size={14} /> Install TaDa on this phone
      </div>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        Put TaDa on your home screen so it opens like an app, full screen, with its own icon. If you removed it before, this puts it back.
      </p>
      {/* There is no TaDa to download in a store, and apps with our name sit
          in both of them. Say so where someone is actually installing. */}
      <p className="mb-3 text-xs font-semibold" style={{ color: C.ink }}>
        TaDa installs from this page. Don&rsquo;t look for it in the Play Store or the App Store &mdash; anything you find there with our name is somebody else&rsquo;s app.
      </p>

      {samsung ? (
        <>
          <p className="mb-2 text-sm" style={{ color: C.ink }}>
            Samsung Internet can&rsquo;t install TaDa at the moment. Samsung builds the app with an old Android setting, so your phone blocks it and warns you it isn&rsquo;t safe. Nothing is wrong with TaDa or with your phone, and we can&rsquo;t fix it from our end.
          </p>
          <p className="mb-2 text-sm font-semibold" style={{ color: C.ink }}>
            Open this page in Chrome instead and it installs in seconds.
          </p>
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm" style={{ color: C.ink }}>
            <li>Tap <b>Copy the link</b>.</li>
            <li>Open <b>Chrome</b> and paste it in.</li>
            <li>Sign in, then tap the three-dot menu and <b>Install app</b>.</li>
          </ol>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/account`);
                setCopied(true);
              } catch {
                // Clipboard blocked. The address is written out below anyway.
              }
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
            style={{ background: C.coral, color: "#fff" }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied. Now open Chrome." : "Copy the link"}
          </button>
          <p className="mt-2 text-center text-xs" style={{ color: C.fade }}>
            {addr || " "}
          </p>
        </>
      ) : done ? (
        <p className="text-sm font-semibold" style={{ color: C.teal }}>
          Installed. Look for the Tada! icon on your home screen.
        </p>
      ) : offer ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await runInstall();
            setBusy(false);
            if (result === "accepted") setDone(true);
          }}
          className="w-full rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: C.coral, color: "#fff", opacity: busy ? 0.7 : 1 }}
        >
          {busy ? "Opening the install prompt..." : "Add TaDa to my home screen"}
        </button>
      ) : ios ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: C.ink }}>
          <li>Open this page in Safari.</li>
          <li>Tap the Share button at the bottom.</li>
          <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
      ) : android ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm" style={{ color: C.ink }}>
          <li>Open this page in Chrome.</li>
          <li>Tap the three-dot menu at the top right.</li>
          <li>Tap <b>Add to Home screen</b> or <b>Install app</b>, then confirm.</li>
          <li>If neither appears, uninstall the old TaDa from your phone&rsquo;s Settings, Apps, then try again.</li>
        </ol>
      ) : (
        <p className="text-sm" style={{ color: C.ink }}>
          In Chrome or Edge, look for the install icon at the right end of the address bar, or open the browser menu and choose <b>Install TaDa</b>.
        </p>
      )}
    </div>
  );
}
