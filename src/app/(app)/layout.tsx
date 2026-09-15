import { getMe } from "@/lib/auth";
import { PlannerProvider } from "@/components/planner/store";
import { Shell } from "@/components/planner/shell";
import { Paywall } from "@/components/planner/paywall";

/**
 * Every signed-in screen lives under this layout. The planner state lives in
 * PlannerProvider and survives tab changes; each tab route just renders its screen.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, plan, billing } = await getMe();
  // Every feature gates off the entitlements table. No active plan means the paywall, admins excepted.
  if (!plan && profile.role !== "admin") return <Paywall name={profile.name} billing={billing} />;
  return (
    <PlannerProvider initialMe={profile} initialPlan={plan} initialBilling={billing}>
      <Shell>{children}</Shell>
    </PlannerProvider>
  );
}
