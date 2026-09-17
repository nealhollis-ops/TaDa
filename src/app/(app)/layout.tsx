import { getMe } from "@/lib/auth";
import { PlannerProvider } from "@/components/planner/store";
import { Shell } from "@/components/planner/shell";
import { Paywall } from "@/components/planner/paywall";
import { InstallCapture } from "@/components/pwa/install-card";

function BannedScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream px-6 text-center">
      <h1 className="text-2xl font-bold text-navy">This account is closed</h1>
      <p className="max-w-sm text-fade">Your TaDa account has been suspended. If you think this is a mistake, write to clientcare@gettada.me and a real person will look into it.</p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="mt-2 text-sm text-navy underline">Sign out</button>
      </form>
    </main>
  );
}

/**
 * Every signed-in screen lives under this layout. The planner state lives in
 * PlannerProvider and survives tab changes; each tab route just renders its screen.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, plan, billing, banned } = await getMe();
  if (banned) return <BannedScreen />;
  // Every feature gates off the entitlements table. No active plan means the paywall, admins excepted.
  if (!plan && profile.role !== "admin") return <Paywall name={profile.name} billing={billing} />;
  return (
    <PlannerProvider initialMe={profile} initialPlan={plan} initialBilling={billing}>
      <InstallCapture />
      <Shell>{children}</Shell>
    </PlannerProvider>
  );
}
