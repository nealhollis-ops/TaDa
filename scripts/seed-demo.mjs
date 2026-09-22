/**
 * Seed a demo account for marketing screenshots.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * Creates (or refreshes) one demo member with a full current month of tasks,
 * lifetime stats and badges, a partner, a standard team with chat, a Boss team
 * with assignments, and a lively community feed. Every supporting member is a
 * fake person on the reserved example.com domain, so nothing can email a real
 * inbox.
 *
 * Env (all optional):
 *   SEED_DEMO_EMAIL     sign-in email for the demo member (default demo@gettada.me)
 *   SEED_DEMO_PASSWORD  password for the demo member. Without it the account is
 *                       created for magic-link sign-in only.
 *
 * Safe to re-run: the demo member's month, teams, posts, messages and
 * partnership are wiped and rebuilt each time. Lifetime stats are overwritten.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local scripts/seed-demo.mjs");
  process.exit(1);
}
const DEMO_EMAIL = (process.env.SEED_DEMO_EMAIL || "demo@gettada.me").toLowerCase();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || null;

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// ------------------------------------------------------------ calendar --
// Mirrors src/lib/planner/calendar.ts: weeks run Monday to Sunday.
const pad = (n) => String(n).padStart(2, "0");
function monthInfo(at = new Date()) {
  const year = at.getFullYear();
  const month = at.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const weeks = [];
  for (let d = 1; d <= days; d++) {
    const monIdx = (new Date(year, month, d).getDay() + 6) % 7;
    if (d === 1 || monIdx === 0) weeks.push({ w: weeks.length + 1, start: d, end: d, days: [d] });
    else {
      const wk = weeks[weeks.length - 1];
      wk.end = d;
      wk.days.push(d);
    }
  }
  return { year, month, days, prefix: `${year}-${pad(month + 1)}`, weeks, weekCount: weeks.length };
}
const M = monthInfo();
const TODAY = new Date().getDate();
const dstr = (d) => `${M.prefix}-${pad(d)}`;
const weekOf = (d) => M.weeks.find((x) => d >= x.start && d <= x.end)?.w ?? 1;
const weekdayOf = (d) => new Date(M.year, M.month, d).getDay();
const fridayOfWeek = (w) => M.weeks[w - 1]?.days.find((d) => weekdayOf(d) === 5) ?? null;
const monthName = new Date(M.year, M.month, 1).toLocaleString("default", { month: "long" });

// Timestamps: a task done on day d was finished at a plausible hour for its block.
const doneAt = (d, block) => {
  const hour = block === "morning" ? 8 : block === "evening" ? 20 : 14;
  return new Date(M.year, M.month, d, hour, 12 + (d % 40)).toISOString();
};
const daysAgo = (n, hour = 10, minute = 0) => {
  const t = new Date();
  t.setDate(t.getDate() - n);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
};

// ------------------------------------------------------------ the cast --
// The demo member is Jamie T., the same person the marketing site shows.
const DEMO = { email: DEMO_EMAIL, name: "Jamie Torres", slug: "jamie", bio: "Freelance designer. Planning the month so my weekends stay mine." };
const CAST = [
  { key: "priya", name: "Priya Nair", slug: "priya", bio: "Nurse, night shifts. Partner-powered since spring." },
  { key: "marcus", name: "Marcus Bell", slug: "marcus", bio: "Video editor at Bright Path." },
  { key: "dana", name: "Dana Whitfield", slug: "dana", bio: "Producer. Runs on coffee and checklists." },
  { key: "leo", name: "Leo Okafor", slug: "leo", bio: "Motion graphics." },
  { key: "sam", name: "Sam Reyes", slug: "sam", bio: "Client services, Bright Path." },
  { key: "ava", name: "Ava Lindqvist", slug: "ava", bio: "Grad student. Thesis month." },
  { key: "tom", name: "Tom Achebe", slug: "tom", bio: "Dad of three, marathon in training." },
];
const castEmail = (c) => `${c.key}@tada-demo.example.com`;

// ------------------------------------------------------- month of tasks --
// The day the screenshots are taken from: always a full, believable day, with a
// Big morning task left open so the celebration shot has something to check off.
// [title, block, big?, done?]
const TODAY_TASKS = [
  ["Deliver the Bright Path storyboard", "morning", true, false],
  ["Morning pages and coffee", "morning", false, true],
  ["Reply to the 3 inbound leads", "afternoon", false, false],
  ["Send the Aster Tea invoice", "afternoon", false, true],
  ["Read 30 pages of 'Grid Systems'", "evening", false, false],
];

// [title, day | {week}, block, big?, repeat?]  day "past" means done, future pending.
const TASKS = [
  // Repeaters (fanned out below)
  { title: "Morning run", repeat: "weekdays", block: "morning", from: 1 },
  { title: "Friday wrap-up and invoices", repeat: "weekly", anchor: 5, block: "afternoon" },
  // Week 1
  ["Brain dump the whole month", 1, "morning", true],
  ["Send Hollis Bakery logo round 2", 2, "afternoon", true],
  ["Book dentist (finally)", 2, "afternoon"],
  ["Renew car registration", 3, "afternoon"],
  ["Sketch packaging concepts for Aster Tea", 3, "morning", true],
  ["Grocery run + meal prep", 4, "evening"],
  ["Call Mom", 5, "evening"],
  ["Clean out the studio closet", 6, "afternoon"],
  // Week 2
  ["Aster Tea packaging: present 3 directions", 8, "morning", true],
  ["Update portfolio site with bakery work", 9, "afternoon", true],
  ["Pay quarterly estimated tax", 9, "morning"],
  ["Coffee with Priya", 10, "afternoon"],
  ["Order new drawing tablet nib set", 10, "evening"],
  ["Birthday gift for Dad", 11, "afternoon"],
  ["Write September newsletter", 12, "morning", true],
  ["Hike with the Sunday crew", 13, "morning"],
  // Week 3 (this week)
  ["Aster Tea: final files to printer", 15, "morning", true],
  ["Reply to the 3 inbound leads", 15, "afternoon"],
  ["Book flights for Thanksgiving", 16, "evening"],
  ["Studio rent + utilities", 16, "afternoon"],
  ["Record process video for Instagram", 17, "afternoon", true],
  ["Read 30 pages of 'Grid Systems'", 17, "evening"],
  ["Deliver Bright Path storyboard v1", 18, "morning", true],
  ["Water the plants, change the filter", 18, "evening"],
  ["Plan next week's time blocks", 19, "morning"],
  // Week 4
  ["Bright Path storyboard revisions", 22, "morning", true],
  ["Oil change", 23, "afternoon"],
  ["Teach the Thursday design workshop", 24, "afternoon", true],
  ["Prep tax docs for accountant", 25, "morning"],
  ["Date night", 26, "evening"],
  // Week 5 / floating
  ["Month-end books and receipts", 29, "afternoon", true],
  ["Set October goals", 30, "morning"],
  ["Return library books", { week: 4 }, "auto"],
  ["Fix the squeaky studio door", { week: 5 }, "auto"],
];

function buildTasks(userId) {
  const rows = [];
  let sort = Date.now() - 5_000_000;
  const push = (t) => rows.push({ id: randomUUID(), user_id: userId, sort: sort++, done_at: null, ...t });

  // Today is owned by TODAY_TASKS, so drop any fixed-day task that lands on it.
  for (const [title, block, big, done] of TODAY_TASKS) {
    push({ title, big, month: M.prefix, week: weekOf(TODAY), date: dstr(TODAY), block, repeat: "none", anchor: null, root_id: null, done, done_at: done ? doneAt(TODAY, block) : null });
  }

  for (const t of TASKS) {
    if (Array.isArray(t)) {
      const [title, when, block, big = false] = t;
      const day = typeof when === "number" ? when : null;
      if (day === TODAY) continue;
      const done = day !== null && day < TODAY;
      push({
        title, big, month: M.prefix,
        week: day !== null ? weekOf(day) : when.week,
        date: day !== null ? dstr(day) : null,
        block, repeat: "none", anchor: null, root_id: null,
        done, done_at: done ? doneAt(day, block) : null,
      });
      continue;
    }
    const rootId = randomUUID();
    if (t.repeat === "weekdays") {
      for (let d = t.from; d <= M.days; d++) {
        const dow = weekdayOf(d);
        if (dow === 0 || dow === 6) continue;
        const done = d < TODAY;
        push({ root_id: rootId, title: t.title, big: false, month: M.prefix, week: weekOf(d), date: dstr(d), block: t.block, repeat: "weekdays", anchor: null, done, done_at: done ? doneAt(d, t.block) : null });
      }
    } else if (t.repeat === "weekly") {
      for (let w = 1; w <= M.weekCount; w++) {
        const d = fridayOfWeek(w);
        if (!d) continue;
        const done = d < TODAY;
        push({ root_id: rootId, title: t.title, big: false, month: M.prefix, week: w, date: dstr(d), block: t.block, repeat: "weekly", anchor: t.anchor, done, done_at: done ? doneAt(d, t.block) : null });
      }
    }
  }
  // Make the first copy of each repeater carry the root id, like the app does.
  const seen = new Set();
  for (const r of rows) {
    if (r.root_id && !seen.has(r.root_id)) {
      seen.add(r.root_id);
      r.id = r.root_id;
    }
  }
  return rows;
}

const progressFor = (tasks) => {
  const weeks = {};
  for (const t of tasks) {
    const w = String(t.date ? weekOf(parseInt(t.date.slice(8), 10)) : t.week);
    weeks[w] ??= { done: 0, total: 0 };
    weeks[w].total += 1;
    if (t.done) weeks[w].done += 1;
  }
  return { total: tasks.length, done: tasks.filter((t) => t.done).length, weeks };
};

// ------------------------------------------------------------- helpers --
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

async function ensureUser({ email, name, slug, bio }, password) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name }, ...(password ? { password } : {}) });
    if (error) throw error;
    user = data.user;
    console.log(`created  ${email}`);
  } else {
    if (password) {
      const { error } = await admin.auth.admin.updateUserById(user.id, { password });
      if (error) throw error;
    }
    console.log(`exists   ${email}`);
  }
  const { error } = await admin.from("profiles").upsert(
    { id: user.id, email, name, slug, bio, onboarding: { tour: true, posted: true, done: true } },
    { onConflict: "id" },
  );
  if (error) {
    // Slug collision with a real member: fall back to a suffixed slug.
    const { error: e2 } = await admin.from("profiles").upsert({ id: user.id, email, name, slug: `${slug}-demo`, bio, onboarding: { tour: true, posted: true, done: true } }, { onConflict: "id" });
    if (e2) throw e2;
  }
  return user.id;
}

const must = (r) => { if (r.error) throw r.error; return r.data; };

async function wipe(demoId, castIds) {
  const everyone = [demoId, ...castIds];
  must(await admin.from("tasks").delete().eq("user_id", demoId).eq("month", M.prefix));
  must(await admin.from("teams").delete().eq("owner_id", demoId));            // cascades members, invites, chat, assignments
  must(await admin.from("posts").delete().in("user_id", everyone));           // cascades replies, reactions
  must(await admin.from("replies").delete().in("user_id", everyone));
  must(await admin.from("reactions").delete().in("user_id", everyone));
  must(await admin.from("messages").delete().or(`from_user.eq.${demoId},to_user.eq.${demoId}`));
  must(await admin.from("partnerships").delete().or(`a_user.eq.${demoId},b_user.eq.${demoId}`));
  must(await admin.from("partner_requests").delete().or(`from_user.eq.${demoId},to_user.eq.${demoId}`));
}

// ---------------------------------------------------------------- main --
console.log(`Seeding ${monthName} ${M.year} (today is the ${TODAY}th, ${M.weekCount} weeks)`);

const demoId = await ensureUser(DEMO, DEMO_PASSWORD);
const ids = {};
for (const c of CAST) ids[c.key] = await ensureUser({ ...c, email: castEmail(c) }, null);

await wipe(demoId, Object.values(ids));

// Demo member rides on Boss so every screen is reachable.
must(await admin.from("entitlements").upsert(
  { user_id: demoId, plan: "boss", source: "comp", status: "active", seats_included: 7, expires_at: null, note: "Demo account for marketing screenshots." },
  { onConflict: "user_id,source" },
));

// Tasks and this month's published progress.
const tasks = buildTasks(demoId);
must(await admin.from("tasks").insert(tasks));
must(await admin.from("progress").upsert({ user_id: demoId, month: M.prefix, ...progressFor(tasks) }, { onConflict: "user_id,month" }));
console.log(`tasks    ${tasks.length} (${tasks.filter((t) => t.done).length} done)`);

// Lifetime stats: the numbers the marketing site quotes (312 finished, 14-day streak).
const monthDone = tasks.filter((t) => t.done);
must(await admin.from("stats").upsert({
  user_id: demoId,
  streak: 14,
  best_streak: 23,
  last_done_day: dstr(Math.max(1, TODAY - 1)),
  total_done: 312,
  big_done: 31,
  morning_done: 64,
  perfect_weeks: 5,
  perfect_keys: [`${M.prefix}-w1`, `${M.prefix}-w2`, "2026-08-w2", "2026-08-w4", "2026-07-w3"],
  comebacks: 1,
  encourages: 28,
}, { onConflict: "user_id" }));
console.log(`stats    streak 14, best 23, ${312} finished lifetime (${monthDone.length} this month)`);

// Supporting cast stats and progress so partner and team views have numbers.
const castStats = {
  priya: { streak: 9, best_streak: 31, total_done: 418, big_done: 40, morning_done: 12, perfect_weeks: 7, encourages: 51, progress: [22, 30] },
  marcus: { streak: 4, best_streak: 12, total_done: 96, big_done: 9, morning_done: 30, perfect_weeks: 1, encourages: 6, progress: [11, 19] },
  dana: { streak: 17, best_streak: 17, total_done: 241, big_done: 22, morning_done: 70, perfect_weeks: 4, encourages: 19, progress: [25, 27] },
  leo: { streak: 2, best_streak: 8, total_done: 57, big_done: 4, morning_done: 5, perfect_weeks: 0, encourages: 3, progress: [8, 16] },
  sam: { streak: 6, best_streak: 14, total_done: 133, big_done: 12, morning_done: 41, perfect_weeks: 2, encourages: 9, progress: [14, 21] },
  ava: { streak: 11, best_streak: 11, total_done: 74, big_done: 15, morning_done: 26, perfect_weeks: 1, encourages: 14, progress: [16, 24] },
  tom: { streak: 21, best_streak: 45, total_done: 602, big_done: 58, morning_done: 210, perfect_weeks: 12, encourages: 88, progress: [19, 22] },
};
for (const [key, s] of Object.entries(castStats)) {
  const { progress: [done, total], ...stats } = s;
  must(await admin.from("stats").upsert({ user_id: ids[key], ...stats, last_done_day: dstr(Math.max(1, TODAY - 1)), perfect_keys: [], comebacks: 0 }, { onConflict: "user_id" }));
  const weeks = {};
  let left = done;
  for (let w = 1; w <= M.weekCount; w++) {
    const wt = Math.max(1, Math.round(total / M.weekCount));
    const wd = Math.max(0, Math.min(wt, left));
    left -= wd;
    weeks[String(w)] = { done: wd, total: wt };
  }
  must(await admin.from("progress").upsert({ user_id: ids[key], month: M.prefix, total, done, weeks }, { onConflict: "user_id,month" }));
}

// Partner: Jamie + Priya, with a short thread.
const [a, b] = [demoId, ids.priya].sort();
must(await admin.from("partnerships").insert({ a_user: a, b_user: b, created_at: daysAgo(120) }));
must(await admin.from("messages").insert([
  { from_user: ids.priya, to_user: demoId, text: "Saw you cleared your whole Tuesday. Show-off. 😄", created_at: daysAgo(2, 21, 4), read_at: daysAgo(2, 21, 30) },
  { from_user: demoId, to_user: ids.priya, text: "The packaging files went to the printer this morning. HUGE weight off.", created_at: daysAgo(2, 21, 33), read_at: daysAgo(2, 22, 1) },
  { from_user: ids.priya, to_user: demoId, text: "🎉🎉 That's the big one! Ok, my turn: two night shifts down, one to go.", created_at: daysAgo(2, 22, 2), read_at: daysAgo(1, 7, 15) },
  { from_user: demoId, to_user: ids.priya, text: "You've got this. Coffee Saturday still on?", created_at: daysAgo(1, 7, 20), read_at: daysAgo(1, 9, 0) },
  { from_user: ids.priya, to_user: demoId, text: "Always. Don't forget your storyboard is due today 👀", created_at: daysAgo(0, 7, 48), read_at: null },
]));

// Standard team with group chat.
const crew = must(await admin.from("teams").insert({ name: "Morning Crew", kind: "standard", owner_id: demoId, created_at: daysAgo(80) }).select("id").single());
must(await admin.from("team_members").insert([demoId, ids.priya, ids.marcus, ids.tom, ids.ava].map((user_id) => ({ team_id: crew.id, user_id }))));
must(await admin.from("team_messages").insert([
  { team_id: crew.id, user_id: ids.tom, text: "5:45am, 8 miles, legs are mad at me. Who else is up?", created_at: daysAgo(1, 6, 2) },
  { team_id: crew.id, user_id: demoId, text: "Up! Run done, coffee in hand, brain dump tomorrow's blocks.", created_at: daysAgo(1, 6, 40) },
  { team_id: crew.id, user_id: ids.ava, text: "Chapter 3 draft is DONE. Thesis month is half over and I'm still standing.", created_at: daysAgo(1, 9, 15) },
  { team_id: crew.id, user_id: ids.priya, text: "Ava!! 🎉 That deserved a bigger burst than the app gives.", created_at: daysAgo(1, 9, 20) },
  { team_id: crew.id, user_id: ids.marcus, text: "Anyone else find that scheduling the boring stuff in the afternoon block actually works? Tax stuff done before lunch for once.", created_at: daysAgo(0, 8, 5) },
  { team_id: crew.id, user_id: demoId, text: "Yes. Mornings for the big scary thing, afternoons for admin. Evenings I protect.", created_at: daysAgo(0, 8, 12) },
]));

// Boss team with assignments (one still in the holding tank).
const studio = must(await admin.from("teams").insert({ name: "Bright Path Studio", kind: "boss", owner_id: demoId, created_at: daysAgo(60) }).select("id").single());
must(await admin.from("team_members").insert([demoId, ids.marcus, ids.dana, ids.leo, ids.sam].map((user_id) => ({ team_id: studio.id, user_id }))));
const asg = (to, title, day, done, from = demoId) => ({
  team_id: studio.id, from_user: from, to_user: to, title,
  date: day ? dstr(day) : null, done, done_at: done ? doneAt(day, "afternoon") : null,
  created_at: daysAgo(day ? Math.max(0, TODAY - day + 3) : 1, 9, 0),
});
must(await admin.from("assignments").insert([
  asg(ids.marcus, "Cut the 60s Aster Tea launch spot", 12, true),
  asg(ids.marcus, "Color pass on the Hollis Bakery reel", 17, true),
  asg(ids.marcus, "Rough cut: Bright Path client testimonial", 24, false),
  asg(ids.dana, "Lock the October shoot schedule", 11, true),
  asg(ids.dana, "Confirm crew and catering for the 26th", 19, false),
  asg(ids.dana, "Send Q4 production budget for review", 30, false),
  asg(ids.leo, "Animate the Aster Tea logo sting", 15, true),
  asg(ids.leo, "Lower-thirds package for the testimonial series", 23, false),
  asg(ids.sam, "Onboard the two new retainer clients", 10, true),
  asg(ids.sam, "September client check-in calls", 18, false),
  asg(ids.sam, "Draft the October newsletter", 26, false),
  asg(null, "Refresh the studio showreel", null, false),   // holding tank
]));
must(await admin.from("team_messages").insert([
  { team_id: studio.id, user_id: demoId, text: "Storyboard v1 for the testimonial series is in your inboxes. Marcus and Leo, flag anything that won't cut together before Monday.", created_at: daysAgo(0, 9, 30) },
  { team_id: studio.id, user_id: ids.marcus, text: "On it. The Aster spot went out yesterday, client already replied with three fire emojis.", created_at: daysAgo(0, 9, 41) },
  { team_id: studio.id, user_id: ids.dana, text: "Crew for the 26th is 80% confirmed. Chasing the last DP today.", created_at: daysAgo(0, 10, 2) },
]));

// Community: questions, wins, boosts. Newest first in the app, so stagger created_at.
const post = (user_id, type, text, ago, extra = {}) => ({ id: randomUUID(), user_id, type, text, created_at: daysAgo(...ago), milestone: false, pinned: false, ...extra });
const posts = [
  post(demoId, "win", `Packaging files for a client I've chased for two months went to the printer this morning. First BIG task of the week, done before 9am. ☕`, [0, 9, 5], { milestone: true }),
  post(ids.tom, "boost", "Whoever's on the fence about checking off that one annoying task: do it now, then come back and tell us. We'll wait. 🔥", [0, 7, 30]),
  post(ids.ava, "question", "How do you all handle a week where one task explodes into ten? Split them into the next week, or just take the hit on the perfect-week streak?", [1, 14, 20]),
  post(ids.dana, "win", "Four perfect weeks in a row. I have never in my life been this organized and it's entirely because the confetti is addictive.", [1, 19, 45], { milestone: true }),
  post(ids.priya, "boost", "Night shift crew, this one's for you: plan tomorrow BEFORE you sleep. Future-you wakes up with a map. 🗺️", [2, 23, 10]),
  post(ids.marcus, "question", "Does anyone actually use the Evening block, or is it just where tasks go to feel guilty?", [3, 17, 0]),
  post(ids.sam, "win", "Hit 'Century' this morning. 100 tasks finished since I started. The badge burst scared my cat.", [4, 8, 50], { milestone: true }),
  post(ids.leo, "win", "Small one but: I've done my morning run 12 weekdays straight. The repeat feature is doing the heavy lifting.", [5, 11, 5]),
  post(ids.tom, "question", "Marathon in 5 weeks. Anyone have a good way to block long runs so the rest of Saturday doesn't collapse?", [6, 6, 15]),
  post(ids.priya, "win", "Partner check-in: Jamie and I have both hit every week this month. Accountability works, people.", [8, 20, 30]),
];
must(await admin.from("posts").insert(posts));
const P = Object.fromEntries(posts.map((p, i) => [i, p.id]));
must(await admin.from("replies").insert([
  { post_id: P[0], user_id: ids.priya, text: "THE big one. So proud. 🎉", created_at: daysAgo(0, 9, 12) },
  { post_id: P[0], user_id: ids.dana, text: "Two months of chasing, gone in one morning block. That's the whole app right there.", created_at: daysAgo(0, 9, 30) },
  { post_id: P[2], user_id: demoId, text: "Split them. A perfect week is 3+ tasks all done, so a smaller honest list beats a heroic one you won't finish.", created_at: daysAgo(1, 15, 2) },
  { post_id: P[2], user_id: ids.tom, text: "What Jamie said. Also mark the scary one Big so it lands in the morning.", created_at: daysAgo(1, 15, 40) },
  { post_id: P[3], user_id: ids.marcus, text: "Four?! I'm at one and already smug about it.", created_at: daysAgo(1, 20, 0) },
  { post_id: P[5], user_id: ids.ava, text: "Evening is for reading and 'call Mom'. Nothing with a deadline.", created_at: daysAgo(3, 17, 22) },
  { post_id: P[5], user_id: demoId, text: "Same. I protect evenings. If it needs brain it goes in the morning.", created_at: daysAgo(3, 18, 5) },
  { post_id: P[6], user_id: ids.tom, text: "Century club! 🏆", created_at: daysAgo(4, 9, 10) },
  { post_id: P[8], user_id: ids.sam, text: "Block it as Big + Morning, then put nothing else on Saturday. Let the app leave the day open.", created_at: daysAgo(6, 7, 0) },
]));
const react = (post, kinds) => kinds.flatMap(([kind, users]) => users.map((user_id) => ({ post_id: post, user_id, kind })));
must(await admin.from("reactions").insert([
  ...react(P[0], [["fire", [ids.priya, ids.dana, ids.marcus, ids.tom, ids.sam]], ["heart", [ids.ava, ids.leo]], ["up", [ids.tom]]]),
  ...react(P[1], [["fire", [demoId, ids.ava, ids.dana]], ["up", [ids.marcus, ids.sam, ids.leo]]]),
  ...react(P[2], [["up", [demoId, ids.tom]]]),
  ...react(P[3], [["fire", [demoId, ids.priya, ids.tom, ids.sam]], ["heart", [ids.ava]], ["smile", [ids.marcus]]]),
  ...react(P[4], [["heart", [demoId, ids.dana]], ["pray", [ids.tom]]]),
  ...react(P[6], [["fire", [demoId, ids.tom, ids.priya, ids.dana, ids.leo, ids.marcus]]]),
  ...react(P[7], [["up", [demoId, ids.priya]], ["fire", [ids.tom]]]),
  ...react(P[9], [["heart", [demoId, ids.dana, ids.ava]], ["fire", [ids.tom]]]),
]));
console.log(`social   partner + 5 messages, 2 teams, 12 assignments, ${posts.length} posts`);

console.log("");
console.log(`done. Sign in at ${process.env.NEXT_PUBLIC_APP_URL || "https://app.gettada.me"}/login as ${DEMO_EMAIL}${DEMO_PASSWORD ? " with the password from SEED_DEMO_PASSWORD" : " using 'Email me a magic link'"}.`);
