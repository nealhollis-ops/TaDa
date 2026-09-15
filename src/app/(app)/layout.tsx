import { getMe } from "@/lib/auth";
import { PlannerProvider } from "@/components/planner/store";
import { Shell } from "@/components/planner/shell";

/**
 * Every signed-in screen lives under this layout. The planner state lives in
 * PlannerProvider and survives tab changes; each tab route just renders its screen.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, plan } = await getMe();
  return (
    <PlannerProvider initialMe={profile} initialPlan={plan}>
      <Shell>{children}</Shell>
    </PlannerProvider>
  );
}
