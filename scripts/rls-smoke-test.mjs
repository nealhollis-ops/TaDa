/**
 * Row Level Security smoke test. Creates two throwaway users, probes the
 * privacy rules, prints a report, and deletes the users again.
 *   npm run test:rls
 */
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { persistSession: false } });
const mk = async (email) => {
  const { data, error } = await admin.auth.admin.createUser({ email, password: "TestPass!2026", email_confirm: true, user_metadata: { name: email.split("@")[0] } });
  if (error) throw error; return data.user;
};
const A = await mk("rls-test-a@example.com"), B = await mk("rls-test-b@example.com");
const asUser = async (email) => { const c = createClient(url, anon, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: "TestPass!2026" }); if (error) throw error; return c; };
const a = await asUser("rls-test-a@example.com"), b = await asUser("rls-test-b@example.com");
const out = {};
// A creates a task
const ins = await a.from("tasks").insert({ user_id: A.id, title: "secret task", month: "2026-09", week: 3 }).select();
out.a_insert_ok = !ins.error; if (ins.error) out.a_insert_err = ins.error.message;
// B tries to read A's tasks
const bRead = await b.from("tasks").select("*"); out.b_sees_tasks = bRead.data?.length ?? bRead.error?.message;
// B tries to insert a task for A
const bIns = await b.from("tasks").insert({ user_id: A.id, title: "forged", month: "2026-09" }); out.b_forge_blocked = !!bIns.error;
// A reads own tasks
const aRead = await a.from("tasks").select("*"); out.a_sees_own = aRead.data?.length;
// profiles: both are public, so B should see A; stats: A not hidden so visible
const bProf = await b.from("profiles").select("email").eq("id", A.id); out.b_sees_a_profile = bProf.data?.length;
// A hides -> B should not see A's stats
await a.from("profiles").update({ hidden: true }).eq("id", A.id);
const bStats = await b.from("stats").select("user_id").eq("user_id", A.id); out.b_sees_hidden_stats = bStats.data?.length;
// A cannot promote self to admin
const promo = await a.from("profiles").update({ role: "admin" }).eq("id", A.id).select("role"); out.self_promote = promo.error ? "blocked:" + promo.error.code : promo.data;
// A cannot grant self an entitlement
const ent = await a.from("entitlements").insert({ user_id: A.id, plan: "boss", source: "comp" }); out.self_entitle_blocked = !!ent.error;
// effective_plan for A (none) via rpc
const ep = await a.rpc("effective_plan", { uid: A.id }); out.a_plan = ep.data;
// message A->B then B reads; a third party cannot
await a.from("messages").insert({ from_user: A.id, to_user: B.id, text: "hi" });
const bMsg = await b.from("messages").select("text"); out.b_reads_dm = bMsg.data?.length;
// stripe function must not be callable by users
const st = await a.rpc("apply_stripe_entitlement", { p_user_id: A.id, p_plan: "boss", p_status: "active", p_stripe_customer_id: "x", p_stripe_sub_id: "y" }); out.stripe_fn_blocked_for_users = !!st.error;
// cleanup
await admin.auth.admin.deleteUser(A.id); await admin.auth.admin.deleteUser(B.id);
const left = await admin.from("tasks").select("id"); out.cleanup_tasks_left = left.data?.length;
console.log(JSON.stringify(out, null, 2));
