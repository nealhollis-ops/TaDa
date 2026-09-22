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

// Each time of day has its own color: morning is yellow, afternoon green, evening cadmium red.
// `color` is the icon and solid uses, `text` is dark enough for small type, `tint` sits behind chips.
export const BLOCK_META = [
  { id: "morning", label: "Morning", color: "#F8B018", text: "#7A5200", tint: "#FEF0C7" },
  { id: "afternoon", label: "Afternoon", color: "#12B76A", text: "#0B6B3A", tint: "#D5F5E3" },
  { id: "evening", label: "Evening", color: "#E30022", text: "#B00018", tint: "#FDE2E2" },
] as const;

export const blockLabel = (b: string) => BLOCK_META.find((x) => x.id === b)?.label ?? "Time TBD";
export const blockMeta = (b: string) => BLOCK_META.find((x) => x.id === b) ?? null;

// The four community rooms, in the order the tabs show. Keys are the database values;
// "boost" keeps its key but reads as Encourage.
export const PTYPE_META = {
  hi: { label: "Hello", tab: "Say Hi", cta: "Say hi", color: "#111111", fg: "#ffffff", placeholder: "Introduce yourself: who you are, what you're working on, what you hope TaDa does for you...", empty: "Nobody has said hi yet. Go first. Tell us who you are and what you're building." },
  question: { label: "Question", tab: "Questions", cta: "Post a question", color: "#12B76A", fg: "#111111", placeholder: "Ask the group anything...", empty: "No questions yet. Ask the first one." },
  win: { label: "Win", tab: "Wins", cta: "Post a win", color: "#F8B018", fg: "#111111", placeholder: "Tell everyone what you finished...", empty: "No wins posted yet. Go earn one, then come brag a little." },
  boost: { label: "Encouragement", tab: "Encourage", cta: "Post encouragement", color: "#E30022", fg: "#ffffff", placeholder: "Drop a word that lifts someone up...", empty: "Nothing here yet. Drop a word that lifts somebody." },
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

/** Badges not yet earned, closest first, with how far along the member is. Iron needs a partner, so it waits until they have one. */
export const nextBadges = (s: StatsLike, hasPartner: boolean, limit = 6): (Badge & { have: number; target: number })[] =>
  BADGE_CATALOG.filter((b) => b.val(s, hasPartner) < b.target && (b.id !== "iron" || hasPartner))
    .map((b) => ({ id: b.id, e: b.e, name: b.name, have: b.val(s, hasPartner), target: b.target }))
    .sort((a, b) => b.have / b.target - a.have / a.target)
    .slice(0, limit);

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
/** The step the member last crossed, so a level bar can run from there to the next one. */
export const levelFloor = (total: number) => {
  let floor = 0;
  for (const s of LEVEL_STEPS) if (total >= s) floor = s;
  if (total > 1000) floor = 1000 + Math.floor((total - 1000) / 300) * 300;
  return floor;
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
    "Sign in and you're in. Today greets you by name, shows the day's power line, and lists what's on for the morning, afternoon, and evening.",
    "Across the top right, left to right: the month, the bell for notifications, the speaker to mute sounds, your streak once you have one going, your photo for your Account, and the door to log out.",
    "The app runs on the current calendar month. Weeks go Monday through Sunday, and Sunday is the built in rest day.",
    "A getting started checklist floats at the bottom right until you finish it: watch the tour, add a task, check one off, say hi in the community, and reach out for a partner. Finish all five and the confetti flies.",
    "Missed the welcome tour, or want to see it again? Use the Watch the welcome tour link at the end of this section. It is a short video walk through the whole app.",
    "Add a photo in Account and you get to place it: drag it around inside the circle, pinch or use the zoom slider, and what sits in the circle is what everyone sees. Change it whenever you like.",
  ]},
  { id: "install", t: "Installing on your phone", b: [
    "TaDa is a web app, so there's nothing to find in an app store. Install it from your Account: scroll to Install TaDa on this phone and follow the steps for your device. It gets its own icon, opens full screen, and works like any other app.",
    "On Android use Chrome, tap the three-dot menu, and choose Add to Home screen or Install app. On iPhone use Safari, tap Share, then Add to Home Screen.",
    "Removed it by accident? Open app.gettada.me in your browser, sign in, and install it again from Account. Your tasks are safe either way; they live in your account, not on the phone.",
  ]},
  { id: "addtasks", t: "Adding tasks", b: [
    "Go to Plan and tap Add task. Type what needs doing, then either pick an exact day or let the app choose one for you inside the week you select. Day lists only offer today onward, so you can't schedule into the past by accident; a task already sitting on an earlier day keeps that day when you edit it.",
    "The month below the buttons has two tabs. Active shows what is still to do, week by week. Completed shows what you have already checked off, so finished work moves out of the way but is never lost. The counts on the tabs are for the whole month.",
    "Pick a time of day if you want. Each one has its own color everywhere in the app: Morning is yellow, Afternoon is green, Evening is red. Tasks with no time yet show a gray Time TBD chip, and tasks with no day yet show Day TBD.",
    "A gray chip like From September means the task was left unfinished last month and carried into this one with no day set. Tap Organize to place it, tap the pencil to choose a day, or remove it if it no longer matters. See When the month turns for the full story.",
    "Check Big win for your major tasks. Big wins get a celebration twice the size, and the app schedules them in mornings when it does the placing.",
  ]},
  { id: "dump", t: "The brain dump", b: [
    "The black card at the top of Plan called Pour it all out takes everything at once. Type the whole jumble, or tap the mic on your phone keyboard and just talk.",
    "Tap Make it into tasks. You'll get a preview list where you can star big wins or remove anything wrong. Each row has a day picker set to Auto; leave it and the app chooses a light day in that week, or pick the exact day yourself and it stays put. Only today and later are offered. Then Add them to my month places everything on your calendar.",
  ]},
  { id: "organize", t: "The Organize button", b: [
    "Organize places every unscheduled task on your lightest open day, spreading the load across the week. Sundays are left open on purpose.",
    "Tasks you gave an exact day, and repeating tasks pinned to a day, stay right where you put them.",
  ]},
  { id: "voice", t: "Talking to the calendar", b: [
    "The bar under the header on Today, Plan, and Timeline is your voice control. Tap the round mic button, say the change, and stop talking. It runs the request on its own.",
    "Try things like: move the workbook to Thursday. Take the printer call off Tuesday. Mark the emails done. Add a dentist visit on the 22nd. You can also type into the bar and tap the arrow.",
    "When it isn't sure what you meant, it asks a question in the yellow note instead of guessing, and nothing moves until it understands you.",
  ]},
  { id: "repeat", t: "Repeating tasks", b: [
    "When adding or editing a task, choose Daily, Daily (Mon - Fri), Every week, or Every month. Daily puts a copy on every remaining day of the month, Mon - Fri skips the weekend, and Every week drops a copy into each remaining week. Every month brings the task back when the calendar flips, without you doing anything.",
    "Editing one copy of a daily task updates every unfinished copy. Switch it back to One time and remove any leftovers you don't want.",
    "Pin a repeat to a day, like Every Monday or the 1st of every month, and the copies land on that exact day, with the pattern shown on a small badge on the task.",
  ]},
  { id: "monthflip", t: "When the month turns", b: [
    "On the first of the month the calendar flips to a fresh month. Two things come with you.",
    "Repeating tasks are rebuilt for the new month automatically: daily and Mon - Fri copies on every day, weekly copies in every week, monthly ones on their day. You never re-enter them.",
    "Unfinished one-time tasks carry over too. Anything you didn't check off last month appears in the new month with no day set, in the current week, wearing a small chip that says which month it came from. Tap Organize to place them all on your lightest days, tap the pencil to pick a day yourself, or remove any that no longer matter.",
    "Last month stays exactly as it was, finished and unfinished, so your streak history and badge progress are untouched. A task only carries once; if you leave it undone again, it carries again the following month.",
  ]},
  { id: "checkoff", t: "Checking things off", b: [
    "Tap the circle next to any task. You'll get a celebration on screen, Deb's TaDa, and a buzz on phones that support it. Five celebration styles take turns. Big wins get twice the show: twice the fireworks, bigger and faster, for twice as long.",
    "Tapped by accident? Tap it again and everything adjusts.",
    "Need it quiet? Tap the speaker icon in the header to mute every app sound. The visuals keep playing, and the app remembers your choice. The welcome TaDa plays once when you arrive and stays quiet after that.",
  ]},
  { id: "streaks", t: "Streaks and badges", b: [
    "The Lifetime card at the bottom of Timeline gathers it all in one place: your current streak, your longest ever, tasks finished since day one, big wins, your Mountain Level with a bar to the next one and exactly how many tasks are left, and every badge you've earned. Next up shows the badges within reach and your progress toward each.",
    "Finish at least one task in a day and your streak grows. The flame with a number shows on Today and next to your name around the app.",
    "Sundays always count toward your streak. Saturdays count too, unless you scheduled tasks for that Saturday and left them undone.",
    "Badges live in the badge case here in Account. Locked ones show your progress toward them, and your top two show next to your name. Break a streak of three or more, then rebuild it, and the Comeback badge is yours.",
    "Tasks completed build your Mountain Level, shown as a small mountain with a number next to your name. Level 1 comes at 10 finished tasks, and the climb keeps going from there. The mountain changes as you rise: green foothills to start, charcoal at level 4, a golden peak at level 7, and at level 10 it turns red and becomes a volcano.",
    "Every new badge and every new level sets off a full ceremony, posts the win to the community so people can cheer, and sends you a notification you can find under the bell.",
  ]},
  { id: "partners", t: "Accountability partners", b: [
    "Partners see your weekly and monthly progress only. Nobody, partner included, ever sees your actual task list.",
    "Turn on I'm looking for a partner here in Account, and your name appears on everyone's Partners tab. Someone taps Ask to partner, you get a request with Accept and Decline, and accepting creates the partnership.",
    "The Messages box on the Partners tab is for partners. With more than one partner, tap a name chip above the chat to switch threads. End partnership sits on every partner card. Boss teams have their own private line under Boss Mode; see Running a Boss team.",
  ]},
  { id: "teams", t: "Teams and Boss teams", b: [
    "The Partners screen has up to three tabs at the top: Partners for everyone, Teams on the Teams plan and up, and Boss Mode on the Boss plan. If someone invites you to a team, the matching tab appears for you too, whatever plan you're on.",
    "On the Teams plan you can create named groups under the Teams tab. Each team has its own member progress view and its own Team room, a boxed chat at the bottom of the team card. Invite people by email, and they join from the link in their inbox or the invite card on their Teams tab.",
    "On the Boss plan, teams you create are boss teams and live under Boss Mode. The owner assigns tasks with deadlines, sees every assignment sorted into Assigned and Completed for each member, and can edit or remove any assignment after the fact. Assigned work shows up on the member's Today tab marked Due today or Overdue, and on their own Boss Mode tab.",
    "Inside a boss team, the hidden and private profile settings don't apply. Your boss and teammates can always open your profile, while everyone outside the team still sees only what your privacy settings allow.",
    "Even in a boss team, personal task lists stay personal. A boss sees the work the boss assigned.",
  ]},
  { id: "teamguide", t: "Running a team, step by step", b: [
    "Teams are for the Teams plan and up: a named group of people who see each other's progress and talk in their own room. Think a mastermind, a small group, or a crew working the same season. A team holds up to 50 people.",
    "1. Create it. On Partners, open the Teams tab, type a name into the box that says Name a new team, and tap the button beside it. You're the owner.",
    "2. Invite people. Open the team and type an email into Invite by email. Each person gets an email with a link plus an invite card on their own Teams tab, and they join with one tap. They need a TaDa account of their own on any plan; if they don't have one yet, the link takes them to sign up first.",
    "3. Read the room. Tap the team name to open it. Every member shows with their photo, streak, badges, and a progress bar for the month. That's the whole point of a team: you see how each other is doing without seeing anyone's actual tasks.",
    "4. Talk in the team room. At the bottom of the open team is a message box that says Message followed by the team's name. It's a private conversation for members only, separate from the public community. Messages arrive live, and a new one lights up the bell for everyone else in the team.",
    "5. Keep it tidy. The owner can remove anyone with the small X beside their name, and you'll confirm first. Any member can leave with Leave this team at the bottom of the open team. The owner's version of that button is Delete this team, which removes the team and its room for everyone.",
    "6. Run more than one. Create as many teams as you like, and one person can be on several. Each has its own room and its own progress view.",
    "What a team can't do: assign tasks or set deadlines. That's the Boss plan, where the owner's teams become boss teams. Everything above still works the same way there, with the boss powers added on top.",
  ]},
  { id: "bossguide", t: "Running a Boss team, step by step", b: [
    "1. Create the team. On Partners, open the Boss Mode tab, type a name into the box that says Name a new boss team and tap the button beside it. It's a boss team because you're on the Boss plan, and you can run more than one.",
    "2. Invite your people by email. Each person gets an email with a link and an invite card on their own Boss Mode tab. They don't need to be on a paid plan of their own; your seats cover them. Before they accept, they're told a boss team shares their signup email with you and that hidden and private settings don't apply inside it.",
    "3. Assign work. Open the team and under Assign work pick the person, type the task, choose a deadline and tap Assign. It lands on their Today tab marked Due today or Overdue, with a notification.",
    "4. Track progress. Under Track progress, pick a team member from the dropdown, or All members, and their work sorts into Assigned and Completed tabs with counts, the same way your own Plan does. Overdue items show in red.",
    "5. Change your mind. Every assignment has a pencil and a trash can. The pencil lets you reword it, move the deadline or hand it to someone else; handing it to a new person notifies them. The trash can asks you to confirm before it deletes.",
    "6. Talk in two boxes. At the bottom of every boss team card sit two conversations, each in its own box. Team room comes first and everyone on the team reads it. Direct messages sits below it: pick one member from the dropdown and talk privately; they see the thread as Message your boss on their own Boss Mode tab, and only the two of you can read it. A red N new badge on the Direct messages title, and (2 new) beside a name in the dropdown, tell you who is waiting on you.",
    "Both boxes keep things tidy: only the opening message shows, and everything after it sits behind a bar that reads 3 replies, with a red unread count if any are new to you. Tap the bar to open the replies, which marks them read; Hide replies closes it again. Sending a message opens the box for you.",
    "Past-due reminders. The morning after an assigned task's deadline passes with it still open, the person it belongs to gets one reminder in their bell (and a push if their alerts are on). It says Past due with the task name. You see the same task marked Overdue in red under Track progress.",
    "7. Watch your seats. Seven member seats are included across all your boss teams, and extras are $9 a month each. One person on two of your teams uses one seat. The seat meter above your teams shows what's in use, and the Your seats roster in Account lists every seat holder with their email and teams.",
    "8. Removing someone. Tap the small X beside their name and confirm. Their unfinished assigned work drops into a holding tank inside the team, where you reassign each task or let it go. Removing a member frees an included seat or ends an extra charge on your next bill; seats are counted once a day.",
    "What you can't see: their personal task list, their streak details unless their profile allows it outside the team, and their private messages. What they can't see: each other's personal tasks. Progress numbers are shared; task lists never are.",
  ]},
  { id: "community", t: "The community", b: [
    "Four rooms sit under Community: Say Hi, Questions, Wins, and Encourage. Say Hi is where you introduce yourself when you arrive. The tab you're on is the room you're posting in. The line at the top is the only rule: be the kind of voice you'd want to hear.",
    "The feed sorts three ways. New is the default and shows posts in the order they were made, newest first. Active lifts a post back to the top whenever it gets a fresh reply, so good conversations stay alive. Top raises the most loved posts. The Milestones button hides or shows the automatic badge posts, and Show more loads the feed in batches.",
    "Replies stay tucked behind a count, like 3 replies, so the feed stays clean. Tap the count to open the conversation. Reply tags the poster with an @ for you, and the @ on any reply tags that person instead. To tag anyone else, type @ and the start of their name in a post or reply and pick them from the chips that appear; they get a notification. The Refresh button at the top reloads the feed if you ever want to be sure you have the latest. The small gray smiley button opens reactions: heart, fire, thumbs up, prayer, and smile. Posts and replies both take reactions. Tap a reaction chip again to take yours back.",
    "Your own posts and replies show a small pencil and trash can. Pencil lets you fix the wording, and an edited note appears beside the time. Trash asks once, then removes it for everyone; deleting a post takes its replies with it. New posts, replies and reactions appear for everyone as they happen, no refresh needed.",
    "When someone replies to your post, or mentions you with an @, you get a notification under the bell and on your phone if alerts are on. You can switch community notifications off on their own in Account and keep everything else.",
    "Tap anyone's photo or name to open their profile: their bio, streak, best streak, Mountain Level, this month's progress, and every badge they've earned. The TaDa team's profiles also carry a link button to their site; tap it to open in a new tab.",
  ]},
  { id: "privacy", t: "Privacy and hiding", b: [
    "Check Keep me hidden here in Account and save. Your card leaves every list and nobody can find you by browsing. Progress numbers are the only thing the app ever shares about you, and hiding stops even that from being listed.",
    "Private profile is its own checkbox in Account. Turn it on and nobody can open your profile card, which keeps your badges, streaks, and bio to yourself. Your name and posts still show.",
    "Messages and partner activity arrive live. If something looks stale, tap Refresh.",
    "Block anyone from their profile. Open a profile, tap Block this member, and their posts, replies, and messages vanish from your view. They're never notified. Unblock any time under Blocked members in your Account. The Report button beside it sends the profile to us for a look.",
    "The full Privacy Policy and Terms are linked at the bottom of Account.",
  ]},
  { id: "plans", t: "Plans and pricing", b: [
    "Standard is $17 a month or $170 a year with two months free. It holds the full planner, celebrations, community, and one accountability partner.",
    "Teams is $27 a month or $270 a year, adding unlimited partners and named groups. Boss is $97 a month or $970 a year with 7 member seats included and $9 a month per extra seat.",
    "Every new account starts with 14 days free. You add a card when you pick a plan, nothing is charged until day 15, and cancelling before then costs nothing. To upgrade, open Account and tap Upgrade to Teams or Upgrade to Boss on the Your plan card. It takes effect right away and charges only the difference for the rest of the period. Cancel any time from the Manage billing button on the same card, and see the Refund Policy for the rest.",
  ]},
  { id: "notifs", t: "Notifications and the bell", b: [
    "The bell at the top of every screen collects everything that needs you: new messages, partner requests, team invites, work assigned by a boss and past-due reminders for it, badges and levels you earn, replies and mentions in the community, and the occasional announcement from us. A red number on the bell is your unread count. Tap an item to open the right screen; Mark all read clears the count.",
    "Device alerts are separate and on from day one. Your phone or computer gets a short notification for the same events when you're away from the app. Turn them off with the Notifications switch in Account, and flip them back just as fast. Your browser may ask for permission the first time, and alerts only work once you allow it. On iPhone, install TaDa to your home screen first.",
    "Want the community quieter? The From the community switch under Notifications turns off replies and mentions only, both on your device and under the bell, while everything else still comes through.",
  ]},
  { id: "logout", t: "Logging out and switching accounts", b: [
    "Tap the door icon at the top right of any screen, or the Log out button in Account. You'll land on the sign-in page. On a shared computer, log out when you're done.",
    "To sign in on a new device, open app.gettada.me and use the same email. A magic link or your password gets you in; set or change a password from the link at the bottom of Account.",
  ]},
  { id: "faq", t: "Common questions", b: [
    "Q: Can anyone see my tasks?",
    "A: No. Partners and teammates see progress numbers only. In a boss team, the boss sees just the tasks the boss assigned.",
    "Q: Why didn't my streak break over the weekend?",
    "A: Sundays always count, and an unscheduled Saturday counts too. Rest was part of the design.",
    "Q: My partner's message isn't showing.",
    "A: Tap Refresh at the top of the Partners screen or open the app again, and it'll be there. In a boss team, check the right box: Team room is for everyone, Direct messages is just you and your boss, and replies sit behind the replies bar until you tap it.",
    "Q: How do I move a task to a different day?",
    "A: Tap the pencil on the task, or just tell the calendar bar something like move it to Thursday.",
    "Q: What happens to tasks I didn't finish last month?",
    "A: They come with you into the new month with no day set, marked with the month they came from. Organize places them, or pick a day yourself.",
    "Q: How do I stop a repeating task?",
    "A: Tap its pencil, switch it to One time, and remove any leftover copies you don't want.",
    "Q: How do I turn the sound off?",
    "A: Tap the speaker icon in the header. The visuals keep playing, and sound stays off until you tap it again.",
    "Q: I deleted the app from my phone. How do I get it back?",
    "A: Open app.gettada.me in your browser, sign in, and use Install TaDa on this phone in Account. Nothing was lost.",
    "Q: I'm getting too many notifications from the community.",
    "A: In Account, under Notifications, switch off From the community. Messages, partners, teams, and badges still come through.",
    "Q: How do I reach a real person?",
    "A: Email clientcare@gettada.me and we'll take care of you.",
  ]},
];
