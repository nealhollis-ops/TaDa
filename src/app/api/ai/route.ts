import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { dstr, lastPickableDate, monthInfo, todayStr, validDate, weekOf, pad, WDFULL } from "@/lib/planner/calendar";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_CAP = 30;
const MODEL = "claude-opus-5";

/**
 * The shape the dump must come back in. Every field is required, so a repeat or
 * a time of day can never be quietly dropped; "" and "none" and -1 stand in for
 * "not stated" so no field is nullable.
 */
const DUMP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "week", "big", "date", "block", "repeat", "weekday"],
        properties: {
          title: { type: "string" },
          week: { type: "integer" },
          big: { type: "boolean" },
          date: { type: "string", description: "YYYY-MM-DD, or an empty string when no single day was named" },
          block: { type: "string", enum: ["none", "morning", "afternoon", "evening"] },
          repeat: { type: "string", enum: ["none", "daily", "weekdays", "weekly", "monthly"] },
          weekday: { type: "integer", description: "0 Sunday to 6 Saturday when repeat is weekly, otherwise -1" },
        },
      },
    },
  },
} as const;


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
      `Split their words into separate tasks, one item each. ` +
      `"week" is a number from ${currentWeek} to ${m.weekCount}. "big" is true only if it sounds like a major project. ` +
      `"date" is a day only when they name one particular day, otherwise an empty string. ` +
      `"block" is the time of day they said, otherwise "none". ` +
      `"weekday" is 0 for Sunday through 6 for Saturday when repeat is "weekly", otherwise -1. ` +
      `Read their timing words: "every day" is daily; "every weekday" or "Monday to Friday" is weekdays; ` +
      `"on Fridays" or "every Friday" is weekly with weekday 5; "monthly" or "every month" is monthly; ` +
      `"this Friday" or "on the 14th" is a single date, not a repeat. ` +
      `"every morning" means repeat daily and block morning. Anything with no timing words gets repeat "none", an empty date and block "none". ` +
      `Keep the timing words out of the title, since the repeat and the block already carry them: ` +
      `"every weekday do a morning run" has the title "Morning run", and "team check-in on Fridays" has the title "Team check-in". ` +
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
      `Match tasks loosely by meaning. ` +
      `Dates may run from ${dstr(m, 1)} to ${lastPickableDate(m)}, so a day in a later month is fine: "the first week of April" or "next March" becomes a real date in that month, and the task waits under Later on Plan until its month comes around. ` +
      `A task given a date beyond this month does not repeat. ` +
      `If nothing matches or the request is unclear, use "ops":[] and put a short question in "say".`;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      // The dump has the most to get right, so it gets the schema and a step more effort.
      output_config: kind === "dump" ? { effort: "medium" as const, format: { type: "json_schema" as const, schema: DUMP_SCHEMA as unknown as Record<string, unknown> } } : { effort: "low" as const },
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
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);

    if (kind === "dump") {
      const arr: Record<string, unknown>[] = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
      const BLOCKS = ["morning", "afternoon", "evening"];
      const REPEATS = ["none", "daily", "weekdays", "weekly", "monthly"];
      const items = arr
        .filter((x) => x && typeof x.title === "string" && x.title.trim())
        .map((x) => {
          // A date only counts if it is a real day of this month and not already gone.
          const date = validDate(m, typeof x.date === "string" && x.date ? x.date : null);
          const repeat = REPEATS.includes(String(x.repeat)) ? String(x.repeat) : "none";
          const wd = parseInt(String(x.weekday), 10);
          return {
            title: String(x.title).trim().slice(0, 120),
            week: Math.min(m.weekCount, Math.max(1, parseInt(String(x.week), 10) || currentWeek)),
            big: !!x.big,
            date: date && date >= today ? date : null,
            block: BLOCKS.includes(String(x.block)) ? String(x.block) : null,
            // "none" and -1 are the schema's way of saying nothing was stated.
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
