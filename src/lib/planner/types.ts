export type Block = "auto" | "morning" | "afternoon" | "evening";
export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";
export type Plan = "standard" | "teams" | "boss";
export type PostType = "hi" | "question" | "win" | "boost";
export type ReactKind = "heart" | "fire" | "up" | "pray" | "smile";

export type Task = {
  id: string;
  rootId: string | null;
  title: string;
  big: boolean;
  month: string;
  week: number;
  date: string | null;
  block: Block;
  repeat: Repeat;
  anchor: number | null;
  done: boolean;
  doneAt: string | null;
  sort: number;
  carriedFrom: string | null;
  /** True once this day was edited on its own; series edits skip it. */
  exception: boolean;
};

export type Stats = {
  streak: number;
  bestStreak: number;
  lastDoneDay: string | null;
  totalDone: number;
  bigDone: number;
  morningDone: number;
  perfectWeeks: number;
  perfectKeys: string[];
  comebacks: number;
  encourages: number;
};

export const DEF_STATS: Stats = {
  streak: 0,
  bestStreak: 0,
  lastDoneDay: null,
  totalDone: 0,
  bigDone: 0,
  morningDone: 0,
  perfectWeeks: 0,
  perfectKeys: [],
  comebacks: 0,
  encourages: 0,
};

/** One line the brain dump understood, before it becomes tasks. */
export type DumpItem = {
  title: string;
  week: number;
  big: boolean;
  date?: string | null;
  block?: Block | null;
  repeat?: Repeat;
  weekday?: number | null;
};

/** A notice the founders put across Today and Plan for a set window. */
export type Banner = { id: string; text: string; startsAt: string; endsAt: string };

/** A line of conversation kept on a piece of assigned work, boss mode only. */
export type AssignmentNote = { id: string; assignmentId: string; userId: string; text: string; createdAt: string };

export type Badge = { id: string; e: string; name: string };

/** What every signed-in member can see about another member. */
export type Member = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  hidden: boolean;
  private: boolean;
  seeking: boolean;
  role: "member" | "admin";
};

/** Progress numbers a member has published for the current month. */
export type Progress = {
  total: number;
  done: number;
  weeks: Record<string, { done: number; total: number }>;
  updatedAt: string;
};

/** A member plus whatever of their stats/progress the viewer is allowed to see. */
export type MemberCard = Member & {
  stats: Pick<Stats, "streak" | "bestStreak" | "totalDone" | "bigDone" | "morningDone" | "perfectWeeks" | "comebacks" | "encourages"> | null;
  progress: Progress | null;
  hasPartner: boolean;
};

export type MyProfile = {
  id: string;
  email: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  bio: string;
  /** Admins only: a URL to their bio page, site or product. */
  link: string;
  role: "member" | "admin";
  hidden: boolean;
  private: boolean;
  seeking: boolean;
  muted: boolean;
  notifOn: boolean;
  notifCommunity: boolean;
  onboarding: { tour: boolean; posted: boolean; done: boolean };
};

export type PartnerRequest = { id: string; fromUser: string; toUser: string; status: "pending" | "accepted" | "declined"; createdAt: string };
export type Partnership = { id: string; aUser: string; bUser: string; createdAt: string };
export type Message = { id: string; fromUser: string; toUser: string; text: string; createdAt: string; readAt: string | null };

export type Team = { id: string; name: string; kind: "standard" | "boss"; ownerId: string; createdAt: string; members: string[] };
export type TeamInvite = { id: string; teamId: string; email: string; token: string; invitedBy: string; acceptedAt: string | null; createdAt: string; teamName?: string; teamKind?: "standard" | "boss" };
export type TeamMessage = { id: string; teamId: string; userId: string; text: string; createdAt: string };
export type Assignment = { id: string; teamId: string; fromUser: string; toUser: string | null; title: string; date: string | null; done: boolean; doneAt: string | null; createdAt: string };

export type Reply = { id: string; postId: string; userId: string; text: string; createdAt: string; edited: boolean; reactions: Record<string, string[]> };
export type Post = {
  id: string;
  userId: string;
  type: PostType;
  text: string;
  milestone: boolean;
  pinned: boolean;
  createdAt: string;
  edited: boolean;
  replies: Reply[];
  reactions: Record<string, string[]>; // kind -> user ids
};

export type SeatRow = { userId: string; name: string; avatarUrl: string | null; email: string; teamNames: string[] };
