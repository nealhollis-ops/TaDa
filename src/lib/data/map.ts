/* Row <-> app object mapping. Keeps snake_case at the database edge only. */
import type { Assignment, Member, Message, PartnerRequest, Partnership, Post, Progress, Reply, Stats, Task, Team, TeamMessage } from "@/lib/planner/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const MEMBER_COLS = "id,name,slug,avatar_url,hidden,private,seeking,role";

export const toTask = (r: Row): Task => ({
  id: r.id,
  rootId: r.root_id ?? null,
  title: r.title,
  big: !!r.big,
  month: r.month,
  week: r.week ?? 1,
  date: r.date ?? null,
  block: r.block ?? "auto",
  repeat: r.repeat ?? "none",
  anchor: r.anchor ?? null,
  done: !!r.done,
  doneAt: r.done_at ?? null,
  sort: r.sort ?? 0,
  carriedFrom: r.carried_from ?? null,
});

export const fromTask = (userId: string, t: Task) => ({
  id: t.id,
  user_id: userId,
  root_id: t.rootId,
  title: t.title,
  big: t.big,
  month: t.month,
  week: t.week,
  date: t.date,
  block: t.block,
  repeat: t.repeat,
  anchor: t.anchor,
  done: t.done,
  done_at: t.doneAt,
  sort: t.sort,
  carried_from: t.carriedFrom,
});

export const toStats = (r: Row | null): Stats | null =>
  r
    ? {
        streak: r.streak ?? 0,
        bestStreak: r.best_streak ?? 0,
        lastDoneDay: r.last_done_day ?? null,
        totalDone: r.total_done ?? 0,
        bigDone: r.big_done ?? 0,
        morningDone: r.morning_done ?? 0,
        perfectWeeks: r.perfect_weeks ?? 0,
        perfectKeys: r.perfect_keys ?? [],
        comebacks: r.comebacks ?? 0,
        encourages: r.encourages ?? 0,
      }
    : null;

export const fromStats = (userId: string, s: Stats) => ({
  user_id: userId,
  streak: s.streak,
  best_streak: s.bestStreak,
  last_done_day: s.lastDoneDay,
  total_done: s.totalDone,
  big_done: s.bigDone,
  morning_done: s.morningDone,
  perfect_weeks: s.perfectWeeks,
  perfect_keys: s.perfectKeys,
  comebacks: s.comebacks,
  encourages: s.encourages,
});

export const toMember = (r: Row): Member => ({
  id: r.id,
  name: r.name ?? "",
  slug: r.slug ?? "",
  avatarUrl: r.avatar_url ?? null,
  hidden: !!r.hidden,
  private: !!r.private,
  seeking: !!r.seeking,
  role: r.role ?? "member",
});

export const toProgress = (r: Row | null): Progress | null =>
  r ? { total: r.total ?? 0, done: r.done ?? 0, weeks: r.weeks ?? {}, updatedAt: r.updated_at ?? "" } : null;

export const toRequest = (r: Row): PartnerRequest => ({ id: r.id, fromUser: r.from_user, toUser: r.to_user, status: r.status, createdAt: r.created_at });
export const toPartnership = (r: Row): Partnership => ({ id: r.id, aUser: r.a_user, bUser: r.b_user, createdAt: r.created_at });
export const toMessage = (r: Row): Message => ({ id: r.id, fromUser: r.from_user, toUser: r.to_user, text: r.text, createdAt: r.created_at, readAt: r.read_at ?? null });
export const toTeam = (r: Row, members: string[]): Team => ({ id: r.id, name: r.name, kind: r.kind, ownerId: r.owner_id, createdAt: r.created_at, members });
export const toTeamMessage = (r: Row): TeamMessage => ({ id: r.id, teamId: r.team_id, userId: r.user_id, text: r.text, createdAt: r.created_at });
export const toAssignment = (r: Row): Assignment => ({
  id: r.id, teamId: r.team_id, fromUser: r.from_user, toUser: r.to_user ?? null, title: r.title, date: r.date ?? null,
  done: !!r.done, doneAt: r.done_at ?? null, createdAt: r.created_at,
});
export const toReply = (r: Row, reactions: Record<string, string[]> = {}): Reply => ({ id: r.id, postId: r.post_id, userId: r.user_id, text: r.text, createdAt: r.created_at, edited: !!r.edited_at, reactions });
export const toPost = (r: Row, replies: Reply[], reactions: Record<string, string[]>): Post => ({
  id: r.id, userId: r.user_id, type: r.type, text: r.text, milestone: !!r.milestone, pinned: !!r.pinned, createdAt: r.created_at, edited: !!r.edited_at, replies, reactions,
});
