import type { Metadata, Viewport } from "next";
import { publicEnv } from "@/lib/env";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: { default: "TaDa", template: "%s | TaDa" },
  description: "Plan your day, check it off, and hear the TaDa.",
  applicationName: "TaDa",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TaDa",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: "TaDa",
    description: "Plan your day, check it off, and hear the TaDa.",
    url: publicEnv.appUrl,
    siteName: "TaDa",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-cream text-ink">
        {/* Chrome makes its install offer early in the page load, often before
            React has hydrated and on pages this app does not mount into. Catch
            it here during parsing and stash it, so Account can still offer the
            button later instead of falling back to written instructions. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__tadaInstallOffer=null;addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__tadaInstallOffer=e;});addEventListener('appinstalled',function(){window.__tadaInstallOffer=null;});",
          }}
        />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
