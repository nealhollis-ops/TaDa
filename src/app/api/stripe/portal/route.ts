import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request-origin";
import { getPortalConfigId, getStripe } from "@/lib/stripe";

/** POST /api/stripe/portal -> { url } to the Stripe Customer Portal (change card, switch plan, cancel). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 404 });

  const origin = await requestOrigin();
  const configuration = await getPortalConfigId();
  const session = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${origin}/account`,
    ...(configuration ? { configuration } : {}),
  });
  return NextResponse.json({ url: session.url });
}
