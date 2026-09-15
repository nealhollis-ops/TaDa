export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold text-navy">You are offline</h1>
      <p className="max-w-sm text-fade">
        TaDa needs a connection to load your list. Reconnect and pull down to refresh.
      </p>
    </main>
  );
}
