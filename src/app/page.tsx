import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** The root is just a fork: signed in goes to Today, everyone else to the sign-in screen. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/today" : "/login");
}
