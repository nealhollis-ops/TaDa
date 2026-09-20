import { Suspense } from "react";
import { PartnersScreen } from "@/components/planner/screens/partners";

export const metadata = { title: "Partners" };

// PartnersScreen reads ?tab= to open a tab from a notification, which needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <PartnersScreen />
    </Suspense>
  );
}
