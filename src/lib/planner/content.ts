import type { Badge, Stats } from "./types";

// Daily power lines. Marching orders for the day's list.
// Rooted in the Word underneath, worded for everyone.
// Named quotes are kept to ones with solid, well-documented attribution.
export const QUOTES: { text: string; by: string | null }[] = [
  { text: "You were made to carry heavier things than today's list. So stop negotiating with it and start crossing it off.", by: null },
  { text: "Do what you can, with what you have, where you are.", by: "Theodore Roosevelt" },
  { text: "Nobody is coming to do your list for you, and that's actually good news. It means it's yours. Hit the first task and let momentum recruit the rest of you.", by: null },
  { text: "If there is no struggle, there is no progress.", by: "Frederick Douglass" },
  { text: "Fear didn't come standard with you. Power did. So grab the hardest thing on the list and do it first, while fear is still lacing its shoes.", by: null },
  { text: "Genius is one percent inspiration, ninety-nine percent perspiration.", by: "Thomas Edison" },
  { text: "The only way to lose today is to quit on it. Tired is allowed. Stopping is not. The reward lives on the far side of finished.", by: null },
  { text: "Don't count the days. Make the days count.", by: "Muhammad Ali" },
  { text: "You're doing a great work, so don't come down. Every distraction can wait. The work can't.", by: null },
  { text: "A dream doesn't become reality through magic; it takes sweat, determination and hard work.", by: "Colin Powell" },
  { text: "Treat the small tasks like auditions for the big ones, because that's exactly what they are. Faithful over little gets promoted over much.", by: null },
  { text: "That mountain on your list, the one you keep walking around? Speak to it, start it, and watch it shrink under your feet.", by: null },
  { text: "Knowing what to do has never once changed a life. Doing it is the whole game. Go be the one who actually does it.", by: null },
  { text: "Do your work so well it opens doors you never knocked on. Excellence always finds an audience.", by: null },
  { text: "Improvising keeps you busy without moving you. You have a list and you have daylight. Work the plan until it's done.", by: null },
  { text: "Push hard all week, then guard your day of rest like part of the job, because it is. Rest is maintenance on the machine.", by: null },
  { text: "Yesterday's unfinished business doesn't get a vote today. Run at this day like the finish line is in sight, because it is.", by: null },
  { text: "Two get more done than one. Say today's target out loud to your partner. A goal with a witness is twice as hard to drop.", by: null },
];

export const BLOCK_META = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
] as const;

export const blockLabel = (b: string) => BLOCK_META.find((x) => x.id === b)?.label ?? "Time TBD";

export const PTYPE_META = {
  question: { label: "Question", color: "#12B76A", fg: "#111111" },
  win: { label: "Win", color: "#F8B018", fg: "#111111" },
  boost: { label: "Boost", color: "#E30022", fg: "#ffffff" },
} as const;

export const REACTS = [
  { id: "heart", e: "❤️" },
  { id: "fire", e: "🔥" },
  { id: "up", e: "👍" },
  { id: "pray", e: "🙏" },
  { id: "smile", e: "😊" },
] as const;

export const TEAM_CAP = 50;
export const SEATS_INCLUDED = 7;
export const EXTRA_SEAT_PRICE = 9;

// ---------- gamification ----------
type StatsLike = Pick<Stats, "bestStreak" | "totalDone" | "bigDone" | "morningDone" | "perfectWeeks" | "comebacks" | "encourages">;

export const BADGE_CATALOG: { id: string; e: string; name: string; target: number; val: (s: StatsLike, hp?: boolean) => number }[] = [
  { id: "fire7", e: "🔥", name: "7 Day Fire", target: 7, val: (s) => s.bestStreak },
  { id: "fire21", e: "🔥", name: "21 Day Fire", target: 21, val: (s) => s.bestStreak },
  { id: "fire40", e: "🔥", name: "40 Day Fire", target: 40, val: (s) => s.bestStreak },
  { id: "fire70", e: "🔥", name: "70 Day Fire", target: 70, val: (s) => s.bestStreak },
  { id: "done10", e: "✅", name: "10 Finished", target: 10, val: (s) => s.totalDone },
  { id: "done50", e: "🏅", name: "50 Finished", target: 50, val: (s) => s.totalDone },
  { id: "done100", e: "🏆", name: "Century", target: 100, val: (s) => s.totalDone },
  { id: "done500", e: "👑", name: "500 Finished", target: 500, val: (s) => s.totalDone },
  { id: "big5", e: "⭐", name: "5 Big Wins", target: 5, val: (s) => s.bigDone },
  { id: "big25", e: "🌟", name: "25 Big Wins", target: 25, val: (s) => s.bigDone },
  { id: "big100", e: "⚔️", name: "Giant Slayer", target: 100, val: (s) => s.bigDone },
  { id: "sun25", e: "🌅", name: "First Light", target: 25, val: (s) => s.morningDone },
  { id: "week1", e: "🎯", name: "Perfect Week", target: 1, val: (s) => s.perfectWeeks },
  { id: "week4", e: "🥇", name: "4 Perfect Weeks", target: 4, val: (s) => s.perfectWeeks },
  { id: "dove", e: "🕊️", name: "Encourager", target: 25, val: (s) => s.encourages || 0 },
  { id: "eagle", e: "🦅", name: "Comeback", target: 1, val: (s) => s.comebacks || 0 },
  { id: "iron", e: "🤝", name: "Iron", target: 25, val: (s, hp) => (hp ? s.totalDone : 0) },
];

const BADGE_RANK = ["fire70", "big100", "done500", "fire40", "done100", "week4", "fire21", "big25", "done50", "iron", "eagle", "dove", "sun25", "week1", "fire7", "big5", "done10"];

export const computeBadges = (s: StatsLike, hasPartner: boolean): Badge[] => {
  const earned = BADGE_CATALOG.filter((b) => b.val(s, hasPartner) >= b.target);
  earned.sort((a, b) => BADGE_RANK.indexOf(a.id) - BADGE_RANK.indexOf(b.id));
  return earned.map((b) => ({ id: b.id, e: b.e, name: b.name }));
};

export const findNewBadge = (before: StatsLike, after: StatsLike, hasPartner: boolean): Badge | null => {
  const prev = computeBadges(before, hasPartner);
  const now = computeBadges(after, hasPartner);
  return now.find((b) => !prev.some((p) => p.id === b.id)) ?? null;
};

// Mountain Level: a second track built on tasks completed, not days
export const LEVEL_STEPS = [10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];
export const levelOf = (total: number) => {
  let lv = 0;
  LEVEL_STEPS.forEach((s) => {
    if (total >= s) lv += 1;
  });
  if (total > 1000) lv += Math.floor((total - 1000) / 300);
  return lv;
};
export const nextLevelAt = (total: number) => {
  for (const s of LEVEL_STEPS) if (total < s) return s;
  const over = total - 1000;
  return 1000 + (Math.floor(over / 300) + 1) * 300;
};
export const levelColor = (lv: number) => (lv >= 10 ? "#E30022" : lv >= 7 ? "#7A5200" : lv >= 4 ? "#333333" : "#12B76A");
export const levelIcon = (lv: number) => (lv >= 10 ? "🌋" : lv >= 7 ? "🏔️" : "⛰️");

// ---------- help content ----------
export const HELP: { id: string; t: string; b: string[] }[] = [
  { id: "start", t: "Getting started", b: [
    "Sign in and you're in. Tap the circle icon at the top right to open your Account, where you can add a photo and a short bio.",
    "The app runs on the current calendar month. Weeks go Monday through Sunday, and Sunday is the built in rest day.",
    "A getting started checklist floats at the bottom right until you finish it: watch the tour, add a task, check one off, say hi in the community, and reach out for a partner. Finish all five and the confetti flies.",
  ]},
  { id: "addtasks", t: "Adding tasks", b: [
    "Go to Plan and tap Add task. Type what needs doing, then either pick an exact day or let the app choose one for you inside the week you select.",
    "Pick a time block if you want: morning, afternoon, or evening. Check Big win for your major tasks. Big wins get bigger celebrations, and the app schedules them in mornings when it does the placing.",
  ]},
  { id: "dump", t: "The brain dump", b: [
    "The navy card at the top of Plan called Pour it all out takes everything at once. Type the whole jumble, or tap the mic on your phone keyboard and just talk.",
    "Tap Make it into tasks. You'll get a preview list where you can star big wins or remove anything wrong. Then Add them to my month places every task on your calendar for you.",
  ]},
  { id: "organize", t: "The Organize button", b: [
    "Organize places every unscheduled task on your lightest open day, spreading the load across the week. Sundays are left open on purpose.",
    "Tasks you gave an exact day, and repeating tasks pinned to a day, stay right where you put them.",
  ]},
  { id: "voice", t: "Talking to the calendar", b: [
    "The bar under the header on Today, Plan, and Timeline is your voice control. Tap the round mic button, say the change, and stop talking. It runs the request on its own.",
    "Try things like: move the workbook to Thursday. Take the printer call off Tuesday. Mark the emails done. Add a dentist visit on the 22nd. You can also type into the bar and tap the arrow.",
    "When it isn't sure what you meant, it asks a question in the gold note instead of guessing, and nothing moves until it understands you.",
  ]},
  { id: "repeat", t: "Repeating tasks", b: [
    "When adding or editing a task, choose Daily, Daily (Mon - Fri), Every week, or Every month. Daily puts a copy on every remaining day of the month, Mon - Fri skips the weekend, and Every week drops a copy into each remaining week. Every month brings the task back when the calendar flips, without you doing anything.",
    "Editing one copy of a daily task updates every unfinished copy. Switch it back to One time and remove any leftovers you don't want.",
    "Pin a repeat to a day, like Every Monday or the 1st of every month, and the copies land on that exact day, with the pattern shown on a small badge on the task.",
  ]},
  { id: "checkoff", t: "Checking things off", b: [
    "Tap the circle next to any task. You'll get a celebration on screen, a ta-da sound, and a buzz on phones that support it. Five celebration styles take turns, and big wins get the deluxe show.",
    "Tapped by accident? Tap it again and everything adjusts.",
    "Need it quiet? Tap the speaker icon in the header to mute every app sound. The visuals keep playing, and the app remembers your choice.",
  ]},
  { id: "streaks", t: "Streaks and badges", b: [
    "Finish at least one task in a day and your streak grows. The flame with a number shows on Today and next to your name around the app.",
    "Sundays always count toward your streak. Saturdays count too, unless you scheduled tasks for that Saturday and left them undone.",
    "Badges live in the badge case here in Account. Locked ones show your progress toward them, and your top two show next to your name. Break a streak of three or more, then rebuild it, and the Comeback badge is yours.",
    "Tasks completed build your Mountain Level, shown as a small mountain with a number next to your name. Level 1 comes at 10 finished tasks, and the climb keeps going from there. The mountain changes as you rise: teal foothills to start, navy at level 4, a gold peak with a snow cap at level 7, and at level 10 it becomes a volcano.",
    "Every new badge and every new level sets off a full ceremony and posts the win to the community, so people can cheer for you.",
  ]},
  { id: "partners", t: "Accountability partners", b: [
    "Partners see your weekly and monthly progress only. Nobody, partner included, ever sees your actual task list.",
    "Turn on I'm looking for a partner here in Account, and your name appears on everyone's Partners tab. Someone taps Ask to partner, you get a request with Accept and Decline, and accepting creates the partnership.",
    "Messaging works between partners only. With more than one partner, tap a name chip above the chat to switch threads. End partnership sits on every partner card.",
  ]},
  { id: "teams", t: "Teams and Boss teams", b: [
    "On the Teams plan you can create named groups. Each team has its own member progress view and its own discussion room. Invite people by email, and they join from the link in their inbox or the invite card on their Partners tab.",
    "On the Boss plan, teams you create are boss teams. The owner assigns tasks with deadlines, sees every assignment and its status, and can remove assignments. Assigned work shows up on the member's Today tab marked Due today or Overdue.",
    "Inside a boss team, the hidden and private profile settings don't apply. Your boss and teammates can always open your profile, while everyone outside the team still sees only what your privacy settings allow.",
    "Even in a boss team, personal task lists stay personal. A boss sees the work the boss assigned.",
    "A boss can remove any member with the small X beside their name. You'll confirm first, and the member's unfinished assigned work drops into a holding tank inside the team, where you reassign each task or let it go. At launch, removing a member frees the seat the boss pays for.",
    "Boss plans include 7 member seats shared across all your boss teams, with extras at $9 a month each. One person on two of your teams uses one seat. The seat meter above your teams shows what's in use, and removing a member either frees an included seat or ends an extra charge on your next bill.",
    "Bosses also get a Your seats roster in Account: every seat holder with their photo, name, signup email, and which of your teams they're on.",
  ]},
  { id: "community", t: "The community", b: [
    "Three rooms sit under Community: Questions, Wins, and Boosts. The tab you're on is the room you're posting in.",
    "The feed sorts three ways. Active is the default, and a fresh reply lifts a post back to the top, so good conversations stay alive. New shows posts in the order they were made. Top raises the most loved posts. The Milestones button hides or shows the automatic badge posts, and Show more loads the feed in batches.",
    "Replies stay tucked behind a count, like 3 replies, so the feed stays clean. Tap the count to open the conversation. Reply tags the poster with an @ for you, and the gold @ on any reply tags that person instead. The small gray smiley button opens reactions: heart, fire, thumbs up, prayer, and smile. Tap a reaction chip again to take yours back.",
    "Tap anyone's photo or name to open their profile: their bio, streak, best streak, Mountain Level, this month's progress, and every badge they've earned.",
  ]},
  { id: "privacy", t: "Privacy and hiding", b: [
    "Check Keep me hidden here in Account and save. Your card leaves every list and nobody can find you by browsing. Progress numbers are the only thing the app ever shares about you, and hiding stops even that from being listed.",
    "Private profile is its own checkbox in Account. Turn it on and nobody can open your profile card, which keeps your badges, streaks, and bio to yourself. Your name and posts still show.",
    "Messages and partner activity arrive live. If something looks stale, tap the refresh arrow.",
    "Block anyone from their profile. Open a profile, tap Block this member, and their posts, replies, and messages vanish from your view. They're never notified. Unblock any time under Blocked members in your Account. The Report button beside it sends the profile to us for a look.",
  ]},
  { id: "plans", t: "Plans and pricing", b: [
    "Standard is $17 a month or $170 a year with two months free. It holds the full planner, celebrations, community, and one accountability partner.",
    "Teams is $27 a month or $270 a year, adding unlimited partners and named groups. Boss is $97 a month or $970 a year with 7 member seats included and $9 a month per extra seat.",
    "Every new account starts with 14 days free, then rolls into Standard unless you choose a higher plan. Upgrades prorate, so unused time on your old plan counts toward the new one.",
  ]},
  { id: "notifs", t: "Notifications", b: [
    "Notifications are on from day one. When you're away from the app, your device alerts you about new messages, partner requests, team invites, and freshly assigned work.",
    "Turn them off any time with the Notifications checkbox in Account, and flip them back on just as fast. Your browser or phone may ask for permission the first time, and alerts only work once you allow it. On iPhone, install TaDa to your home screen first.",
  ]},
  { id: "faq", t: "Common questions", b: [
    "Q: Can anyone see my tasks?",
    "A: No. Partners and teammates see progress numbers only. In a boss team, the boss sees just the tasks the boss assigned.",
    "Q: Why didn't my streak break over the weekend?",
    "A: Sundays always count, and an unscheduled Saturday counts too. Rest was part of the design.",
    "Q: My partner's message isn't showing.",
    "A: Tap the refresh arrow on the Partners tab or open the app again, and it'll be there.",
    "Q: How do I move a task to a different day?",
    "A: Tap the pencil on the task, or just tell the calendar bar something like move it to Thursday.",
    "Q: How do I stop a repeating task?",
    "A: Tap its pencil, switch it to One time, and remove any leftover copies you don't want.",
    "Q: How do I turn the sound off?",
    "A: Tap the speaker icon in the header. The visuals keep playing, and sound stays off until you tap it again.",
    "Q: How do I reach a real person?",
    "A: Email clientcare@gettada.me and we'll take care of you.",
  ]},
];
