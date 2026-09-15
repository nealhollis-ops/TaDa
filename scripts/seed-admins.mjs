/**
 * Seed the two founders as admins with permanent Boss access.
 *
 *   node --env-file=.env.local scripts/seed-admins.mjs
 *
 * Reads SEED_ADMIN_EMAILS (comma separated) or falls back to the two below.
 * Safe to re-run: existing users are updated, not duplicated. Passwords are
 * never set here; founders sign in with a magic link, then set a password
 * from the "Forgot your password?" link if they want one.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/seed-admins.mjs");
  process.exit(1);
}

const ADMINS = (process.env.SEED_ADMIN_EMAILS || "debhollis1@gmail.com:Deb,neal.hollis@gmail.com:Neal")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const [email, name] = s.split(":");
    return { email: email.toLowerCase(), name: name || email.split("@")[0] };
  });

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || "").toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

for (const { email, name } of ADMINS) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`created  ${email}`);
  } else {
    console.log(`exists   ${email}`);
  }

  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: user.id, email, name, role: "admin" }, { onConflict: "id", ignoreDuplicates: false });
  if (pErr) {
    // The signup trigger may not have run for pre-existing users; give it a slug.
    const { error: pErr2 } = await admin.from("profiles").upsert(
      { id: user.id, email, name, role: "admin", slug: name.toLowerCase().replace(/[^a-z0-9]/g, "") || "admin" },
      { onConflict: "id" },
    );
    if (pErr2) throw pErr2;
  }

  const { error: eErr } = await admin.from("entitlements").upsert(
    {
      user_id: user.id,
      plan: "boss",
      source: "admin",
      status: "active",
      seats_included: 9999,
      expires_at: null,
      note: "Founder. Rides at the top level free, forever.",
    },
    { onConflict: "user_id,source" },
  );
  if (eErr) throw eErr;

  console.log(`admin    ${email} -> role admin, plan boss (source admin, no expiry)`);
}

console.log("done");
