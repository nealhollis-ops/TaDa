import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { dstr, monthInfo, todayStr, validDate, weekOf, pad, WDFULL } from "@/lib/planner/calendar";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_CAP = 30;
const MODEL = "claude-opus-5";

/**
 * POST /api/ai
 *  { kind: "dump", text }                 -> { items: [{title, week, big, date, block, repeat, weekday}] }
 *  { kind: "command", text, tasks }       -> { ops: [...], say }
 * Runs as the signed-in member; the Anthropic key never leaves the server.
 * Each member gets DAILY_CAP calls a day (bump_ai_usage in Postgres).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { kind?: string; text?: string; tasks?: unknown[] } | null;
  const kind = body?.kind;
  const text = String(body?.text ?? "").trim().slice(0, 4000);
  if (!text || (kind !== "dump" && kind !== "command")) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { data: allowed, error: capErr } = await supabase.rpc("bump_ai_usage", { p_cap: DAILY_CAP });
  if (capErr) return NextResponse.json({ error: "Could not check your daily limit." }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: `You've used today's ${DAILY_CAP} helper calls. It resets at midnight.` }, { status: 429 });

  const m = monthInfo(new Date());
  const today = todayStr();
  const currentWeek = weekOf(m, today);
  const weekList = m.weeks.map((x) => `week ${x.w} is ${x.label}`).join(", ");

  const client = new Anthropic({ apiKey: serverEnv().anthropicApiKey });

  let prompt: string;
  if (kind === "dump") {
    prompt =
      `Someone poured out everything they need to get done this month. Today is ${today}, a ${WDFULL[new Date().getDay()]}. ` +
      `The month's weeks run Monday through Sunday: ${weekList}. We're in week ${currentWeek}. ` +
      `Split their words into separate tasks. Respond with ONLY a JSON array, no other text and no code fences. Each item: ` +
      `{"title": short task in their own words, "week": a number from ${currentWeek} to ${m.weekCount}, "big": true only if it sounds like a major project, ` +
      `"date": "YYYY-MM-DD" only when they name one particular day, else null, ` +
      `"block": "morning" | "afternoon" | "evening" when they say when in the day, else null, ` +
      `"repeat": "none" | "daily" | "weekdays" | "weekly" | "monthly", ` +
      `"weekday": 0 for Sunday through 6 for Saturday when repeat is "weekly", else null}. ` +
      `Read their timing words: "every day" is daily; "every weekday" or "Monday to Friday" is weekdays; ` +
      `"on Fridays" or "every Friday" is weekly with weekday 5; "monthly" or "every month" is monthly; ` +
      `"this Friday" or "on the 14th" is a single date, not a repeat. ` +
      `"every morning" means repeat daily and block morning. Anything with no timing words gets repeat "none", date null, block null. ` +
      `Dates must land between ${today} and ${dstr(m, m.days)}. Spread the tasks with no stated timing evenly across the remaining weeks. Their words: ${text}`;
  } else {
    const tasks = Array.isArray(body?.tasks) ? body!.tasks!.slice(0, 400) : [];
    const tNow = new Date();
    const tmr = new Date(tNow.getFullYear(), tNow.getMonth(), tNow.getDate() + 1);
    const tmrStr = tmr.getMonth() === m.month ? `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}` : null;
    prompt =
      `You manage someone's monthly planner. Today is ${today}. ${tmrStr ? `Tomorrow is ${tmrStr}. ` : ""}` +
      `Weeks run Monday through Sunday: ${weekList}. They said: "${text}". Their tasks: ${JSON.stringify(tasks)}. ` +
      `Turn their request into operations. Respond ONLY with JSON, no code fences: {"ops":[...],"say":"one short friendly sentence about what you did"}. ` +
      `Allowed ops: {"op":"move","id":"...","date":"YYYY-MM-DD"} puts a task on a day (or use "date":null with "week":N to leave it unscheduled in that week), optional "block":"morning"|"afternoon"|"evening". ` +
      `{"op":"remove","id":"..."}. {"op":"add","title":"...","date":"YYYY-MM-DD" or "week":N,"block":...,"big":true,"repeat":"none"|"daily"|"weekdays"|"weekly"|"monthly"} (daily = every day, weekdays = Mon-Fri). ` +
      `{"op":"edit","id":"...","title","big","block","repeat"}. {"op":"complete","id":"..."} and {"op":"uncomplete","id":"..."}. ` +
      `Match tasks loosely by meaning. All dates must fall inside this month. If nothing matches or the request is unclear, use "ops":[] and put a short question in "say".`;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "That one didn't go through. Say it a little differently and I'll get it." }, { status: 422 });
    }
    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();
    const start = raw.indexOf(kind === "dump" ? "[" : "{");
    const end = raw.lastIndexOf(kind === "dump" ? "]" : "}");
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);

    if (kind === "dump") {
      const arr = Array.isArray(parsed) ? parsed : [];
      const BLOCKS = ["morning", "afternoon", "evening"];
      const REPEATS = ["none", "daily", "weekdays", "weekly", "monthly"];
      const items = arr
        .filter((x) => x && typeof x.title === "string" && x.title.trim())
        .map((x) => {
          // A date only counts if it is a real day of this month and not already gone.
          const date = validDate(m, x.date);
          const repeat = REPEATS.includes(String(x.repeat)) ? String(x.repeat) : "none";
          const wd = parseInt(String(x.weekday), 10);
          return {
            title: String(x.title).trim().slice(0, 120),
            week: Math.min(m.weekCount, Math.max(1, parseInt(String(x.week), 10) || currentWeek)),
            big: !!x.big,
            date: date && date >= today ? date : null,
            block: BLOCKS.includes(String(x.block)) ? String(x.block) : null,
            repeat,
            weekday: repeat === "weekly" && wd >= 0 && wd <= 6 ? wd : null,
          };
        });
      return NextResponse.json({ items });
    }
    const ops = Array.isArray(parsed?.ops) ? parsed.ops : [];
    const say = typeof parsed?.say === "string" ? parsed.say : ops.length ? "Done." : "I couldn't match that to anything on the calendar.";
    return NextResponse.json({ ops, say });
  } catch (err) {
    console.error("ai route", err);
    return NextResponse.json({ error: "That one didn't go through. Say it a little differently and I'll get it." }, { status: 502 });
  }
}
