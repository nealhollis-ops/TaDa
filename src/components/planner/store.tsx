"use client";

/**
 * The planner's brain: one provider that owns every piece of app state the
 * prototype kept in its single component, now backed by Supabase.
 * Screens read from usePlanner() and call its actions.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { dayOfYear, todayStr, weekOf, previousMonthPrefix, uid, type MonthInfo } from "@/lib/planner/calendar";
import { computeBadges, findNewBadge, levelOf, QUOTES, SEATS_INCLUDED, TEAM_CAP } from "@/lib/planner/content";
import { buzz, buzzGrand, greet, playChime, playGrand, primeSound, setSoundOn, tryGreet } from "@/lib/planner/sound";
import { applyEdit, applyOps, buildNewTasks, bumpStats, creditPerfectWeek, currentMonth, organizeList, spawnRepeaters, taskWeek, type NewTaskForm } from "@/lib/planner/tasks";
import { DEF_STATS, type Assignment, type Badge, type Member, type Message, type MyProfile, type PartnerRequest, type Partnership, type Plan, type Post, type PostType, type Progress, type ReactKind, type Stats, type Task, type Team, type TeamInvite, type TeamMessage } from "@/lib/planner/types";
import * as P from "@/lib/data/planner";
import * as S from "@/lib/data/social";
import { enablePush, disablePush } from "@/lib/data/push";
import type { Burst } from "./celebrate";
import { loadInbox, markAllNoticesRead, markNoticeRead, toNotice, type Notice } from "@/lib/data/inbox";
import type { Billing } from "@/lib/auth";

export type Ceremony = { id: number; badge: Badge; line1: string; line2: string };
export type ConfirmRemove = { teamId: string; userId: string; name: string; teamName: string };
export type Card = { stats: Stats | null; progress: Progress | null };

type Toast = { id: number; text: string };

export type PlannerState = {
  sb: SupabaseClient;
  me: MyProfile;
  plan: Plan;
  billing: Billing | null;
  month: MonthInfo;
  today: string;
  currentWeek: number;
  loading: boolean;
  tasks: Task[];
  stats: Stats;
  myBadges: Badge[];
  members: Record<string, Member>;
  cards: Record<string, Card>;
  requests: PartnerRequest[];
  partnerships: Partnership[];
  messages: Message[];
  teams: Team[];
  myInvites: TeamInvite[];
  outgoingInvites: TeamInvite[];
  teamMsgs: TeamMessage[];
  assignments: Assignment[];
  posts: Post[];
  blocked: string[];
  seekers: Member[];
  // ui
  burst: Burst | null;
  bigMsg: boolean;
  ceremony: Ceremony | null;
  editing: Task | null;
  viewProfile: string | null;
  confirmRemove: ConfirmRemove | null;
  showTour: boolean;
  onbOpen: boolean;
  showAdd: boolean;
  chatWith: string | null;
  openTeam: string | null;
  refreshing: boolean;
  cmdText: string;
  cmdBusy: boolean;
  cmdSay: string;
  listening: boolean;
  toast: Toast | null;
  inbox: Notice[];
  inboxOpen: boolean;
  unreadCount: number;
  // derived
  myPartnerIds: string[];
  incoming: PartnerRequest[];
  outgoing: PartnerRequest[];
  myTeams: Team[];
  bossSeatIds: string[];
  seatCount: number;
  seatExtra: number;
  assignedToMe: Assignment[];
  activeChat: string | null;
  thread: Message[];
  onbItems: { id: string; label: string; done: boolean }[];
  onbDoneCount: number;
  quote: { text: string; by: string | null };
};

export type PlannerActions = {
  set: <K extends keyof PlannerState>(k: K, v: PlannerState[K]) => void;
  nameOf: (id: string | null | undefined) => string;
  avatarOf: (id: string | null | undefined) => string | null;
  stripFor: (id: string) => { streak?: number; badges?: Badge[]; level?: number };
  isBlocked: (id: string) => boolean;
  inMyBossGroup: (id: string) => boolean;
  toggleTask: (t: Task) => void;
  addTask: (form: NewTaskForm) => void;
  organize: () => void;
  parseDump: (text: string) => Promise<{ title: string; week: number; big: boolean }[]>;
  addDumped: (items: { title: string; week: number; big: boolean }[]) => void;
  runCommand: (text?: string) => Promise<void>;
  startListening: () => void;
  saveEdit: (e: Task) => void;
  removeTask: (id: string) => void;
  sendMsg: (text: string) => Promise<void>;
  addPost: (type: PostType, text: string) => Promise<void>;
  addReply: (postId: string, text: string) => Promise<void>;
  toggleReact: (postId: string, kind: ReactKind) => Promise<void>;
  sendRequest: (to: string) => Promise<void>;
  acceptRequest: (r: PartnerRequest) => Promise<void>;
  declineRequest: (r: PartnerRequest) => Promise<void>;
  endPartnership: (partnerId: string) => Promise<void>;
  createTeam: (name: string) => Promise<void>;
  inviteToTeam: (teamId: string, email: string) => Promise<string | null>;
  answerInvite: (inv: TeamInvite, join: boolean) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  reassignTask: (id: string, userId: string) => Promise<void>;
  sendTeamMsg: (teamId: string, text: string) => Promise<void>;
  assignTask: (teamId: string, toUser: string, title: string, date: string | null) => Promise<void>;
  toggleAssigned: (a: Assignment) => Promise<void>;
  removeAssigned: (id: string) => Promise<void>;
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  reportUser: (id: string, reason: string) => Promise<void>;
  toggleMute: () => void;
  toggleNotif: () => Promise<void>;
  toggleCommunityNotif: () => Promise<void>;
  saveAccount: (patch: Partial<Pick<MyProfile, "name" | "bio" | "hidden" | "private" | "seeking">>) => Promise<void>;
  pickAvatar: (file: File) => Promise<void>;
  removeAvatar: () => Promise<void>;
  markTour: () => void;
  refreshShared: () => Promise<void>;
  loadCardsFor: (ids: string[]) => Promise<void>;
  showToast: (text: string) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  startCheckout: (plan: Plan, interval: "monthly" | "yearly") => Promise<void>;
  openPortal: () => Promise<void>;
};

const Ctx = createContext<(PlannerState & PlannerActions) | null>(null);

export function usePlanner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanner outside PlannerProvider");
  return v;
}

export function PlannerProvider({ initialMe, initialPlan, initialBilling = null, children }: { initialMe: MyProfile; initialPlan: Plan | null; initialBilling?: Billing | null; children: React.ReactNode }) {
  const billing = initialBilling;
  const sb = useMemo(() => createClient(), []);
  const month = useMemo(() => currentMonth(), []);
  const today = todayStr();
  const currentWeek = weekOf(month, today);
  const plan: Plan = initialPlan ?? "standard";

  const [me, setMe] = useState<MyProfile>(initialMe);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>(DEF_STATS);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myInvites, setMyInvites] = useState<TeamInvite[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<TeamInvite[]>([]);
  const [teamMsgs, setTeamMsgs] = useState<TeamMessage[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [seekers, setSeekers] = useState<Member[]>([]);

  const [burst, setBurst] = useState<Burst | null>(null);
  const [bigMsg, setBigMsg] = useState(false);
  const [inbox, setInbox] = useState<Notice[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<ConfirmRemove | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [onbOpen, setOnbOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdText, setCmdText] = useState("");
  const [cmdBusy, setCmdBusy] = useState(false);
  const [cmdSay, setCmdSay] = useState("");
  const [listening, setListening] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Mirrors of the latest state for callbacks that run outside the render cycle.
  const tasksRef = useRef(tasks);
  const statsRef = useRef(stats);
  const membersRef = useRef(members);
  useEffect(() => {
    tasksRef.current = tasks;
    statsRef.current = stats;
    membersRef.current = members;
  }, [tasks, stats, members]);
  const celebRef = useRef(0);
  const recogRef = useRef<SpeechRecognition | null>(null);

  const showToast = useCallback((text: string) => {
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 3500);
  }, []);

  const fail = useCallback(
    (err: unknown, fallback = "That didn't save. Try again in a moment.") => {
      console.error(err);
      const msg = (err as { message?: string })?.message;
      showToast(msg && msg.length < 120 ? msg : fallback);
    },
    [showToast],
  );

  // ---------------------------------------------------------- setters ----
  const setters: Record<string, (v: unknown) => void> = useMemo(
    () => ({
      burst: setBurst as (v: unknown) => void,
      editing: setEditing as (v: unknown) => void,
      viewProfile: setViewProfile as (v: unknown) => void,
      confirmRemove: setConfirmRemove as (v: unknown) => void,
      showTour: setShowTour as (v: unknown) => void,
      onbOpen: setOnbOpen as (v: unknown) => void,
      showAdd: setShowAdd as (v: unknown) => void,
      chatWith: setChatWith as (v: unknown) => void,
      openTeam: setOpenTeam as (v: unknown) => void,
      cmdText: setCmdText as (v: unknown) => void,
      cmdSay: setCmdSay as (v: unknown) => void,
      toast: setToast as (v: unknown) => void,
      inboxOpen: setInboxOpen as (v: unknown) => void,
    }),
    [],
  );
  const set = useCallback(<K extends keyof PlannerState>(k: K, v: PlannerState[K]) => {
    const fn = setters[k as string];
    if (fn) fn(v);
  }, [setters]);

  // ---------------------------------------------------------- members ----
  const ensureMembers = useCallback(
    async (ids: string[]) => {
      const missing = Array.from(new Set(ids.filter((id) => id && !membersRef.current[id])));
      if (!missing.length) return;
      try {
        const list = await S.loadMembers(sb, missing);
        setMembers((m) => {
          const next = { ...m };
          list.forEach((x) => (next[x.id] = x));
          missing.forEach((id) => {
            if (!next[id]) next[id] = { id, name: "Member", slug: "member", avatarUrl: null, hidden: false, private: false, seeking: false, role: "member" };
          });
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    },
    [sb],
  );

  const loadCardsFor = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        const got = await S.loadCards(sb, ids, month.prefix);
        setCards((c) => ({ ...c, ...got }));
      } catch (e) {
        console.error(e);
      }
    },
    [sb, month.prefix],
  );

  // ------------------------------------------------------------- persist --
  const persistTasks = useCallback(
    async (next: Task[], st?: Stats) => {
      const prev = tasksRef.current;
      tasksRef.current = next;
      setTasks(next);
      if (st) {
        statsRef.current = st;
        setStats(st);
      }
      try {
        await P.syncTasks(sb, me.id, prev, next);
        if (st) await P.saveStats(sb, me.id, st);
        await P.publishProgress(sb, me.id, month, next);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, month, fail],
  );

  const persistStats = useCallback(
    async (st: Stats) => {
      statsRef.current = st;
      setStats(st);
      try {
        await P.saveStats(sb, me.id, st);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, fail],
  );

  const saveProfile = useCallback(
    async (patch: Parameters<typeof P.saveMe>[2]) => {
      setMe((m) => ({ ...m, ...patch } as MyProfile));
      try {
        await P.saveMe(sb, me.id, patch);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, fail],
  );

  // ------------------------------------------------------ shared refresh --
  const refreshShared = useCallback(async () => {
    setRefreshing(true);
    try {
      const [reqs, pairs, msgs, tms, invs, asg, ps, blk, seek] = await Promise.all([
        S.loadRequests(sb, me.id),
        S.loadPartnerships(sb, me.id),
        S.loadMessages(sb, me.id),
        S.loadTeams(sb),
        S.loadMyInvites(sb),
        S.loadAssignments(sb),
        S.loadPosts(sb),
        S.loadBlocks(sb, me.id),
        S.loadSeekers(sb),
      ]);
      const [tmsgs, outInv] = await Promise.all([S.loadTeamMessages(sb, tms.map((t) => t.id)), S.loadOutgoingInvites(sb, tms.filter((t) => t.ownerId === me.id).map((t) => t.id))]);
      setRequests(reqs);
      setPartnerships(pairs);
      setMessages(msgs);
      setTeams(tms);
      setMyInvites(invs);
      setOutgoingInvites(outInv);
      setAssignments(asg);
      setPosts(ps);
      setBlocked(blk);
      setSeekers(seek);
      setTeamMsgs(tmsgs);
      const ids = new Set<string>();
      reqs.forEach((r) => (ids.add(r.fromUser), ids.add(r.toUser)));
      pairs.forEach((p) => (ids.add(p.aUser), ids.add(p.bUser)));
      msgs.forEach((m) => (ids.add(m.fromUser), ids.add(m.toUser)));
      tms.forEach((t) => t.members.forEach((id) => ids.add(id)));
      asg.forEach((a) => (ids.add(a.fromUser), a.toUser && ids.add(a.toUser)));
      ps.forEach((p) => (ids.add(p.userId), p.replies.forEach((r) => ids.add(r.userId))));
      tmsgs.forEach((m) => ids.add(m.userId));
      seek.forEach((s) => ids.add(s.id));
      blk.forEach((b) => ids.add(b));
      ids.add(me.id);
      setMembers((m) => {
        const next = { ...m };
        seek.forEach((x) => (next[x.id] = x));
        return next;
      });
      await ensureMembers(Array.from(ids));
      const cardIds = new Set<string>([me.id]);
      pairs.forEach((p) => (cardIds.add(p.aUser), cardIds.add(p.bUser)));
      tms.forEach((t) => t.members.forEach((id) => cardIds.add(id)));
      seek.forEach((s) => cardIds.add(s.id));
      ps.forEach((p) => cardIds.add(p.userId));
      await loadCardsFor(Array.from(cardIds));
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  }, [sb, me.id, ensureMembers, loadCardsFor]);

  // --------------------------------------------------------- initial load --
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cur, st, prevRep] = await Promise.all([P.loadTasks(sb, me.id, month.prefix), P.loadStats(sb, me.id), P.loadRepeatersFrom(sb, me.id, previousMonthPrefix(month))]);
        if (cancelled) return;
        let list = cur;
        const spawned = spawnRepeaters(month, prevRep, cur);
        if (spawned.length) {
          list = organizeList(month, [...cur, ...spawned]);
          await P.syncTasks(sb, me.id, cur, list);
        }
        tasksRef.current = list;
        setTasks(list);
        const s = { ...DEF_STATS, ...(st ?? {}) };
        statsRef.current = s;
        setStats(s);
        setSoundOn(!me.muted);
        await P.publishProgress(sb, me.id, month, list);
        setMembers((m) => ({ ...m, [me.id]: { id: me.id, name: me.name, slug: me.slug, avatarUrl: me.avatarUrl, hidden: me.hidden, private: me.private, seeking: me.seeking, role: me.role } }));
        await refreshShared();
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Greeting: one Ta-Da when the member first arrives, and never again this session.
  // Browsers often block audio before the first tap, so we try right away and only fall back
  // to the first tap if that attempt was refused. Reloads and tab changes do not replay it.
  const greetRef = useRef(false);
  useEffect(() => {
    if (loading || greetRef.current) return;
    greetRef.current = true;
    const KEY = "tada-greeted";
    let already = false;
    try {
      already = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* private mode: just greet once per mount */
    }
    const mark = () => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
    };
    let state: "pending" | "played" | "refused" = already ? "played" : "pending";
    let tapped = false;
    if (!already) {
      void tryGreet().then((ok) => {
        if (ok) {
          state = "played";
          mark();
        } else {
          state = "refused";
          if (tapped) {
            state = "played";
            mark();
            greet();
          }
        }
      });
    }
    const onFirstTap = () => {
      tapped = true;
      // Browsers unlock audio on the first tap: decode the clip now so the first check-off plays instantly.
      primeSound();
      if (state === "refused") {
        state = "played";
        mark();
        greet();
      }
      window.removeEventListener("pointerdown", onFirstTap);
    };
    window.addEventListener("pointerdown", onFirstTap, { once: true });
    return () => window.removeEventListener("pointerdown", onFirstTap);
  }, [loading]);

  // Register this device for push once, when notifications are on and already permitted.
  useEffect(() => {
    if (loading || !me.notifOn) return;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") void enablePush();
  }, [loading, me.notifOn]);

  // ------------------------------------------------------------ realtime --
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    let ch: ReturnType<typeof sb.channel> | null = null;
    // The browser client keeps the session in cookies; hand the token to the
    // realtime socket explicitly so RLS-filtered changes reach this member.
    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.access_token) sb.realtime.setAuth(data.session.access_token);
      ch = sb
      .channel(`live-${me.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` }, (payload) => {
        const n = toNotice(payload.new as Parameters<typeof toNotice>[0]);
        setInbox((list) => (list.some((x) => x.id === n.id) ? list : [n, ...list].slice(0, 60)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `to_user=eq.${me.id}` }, (payload) => {
        const r = payload.new as Record<string, string>;
        const msg: Message = { id: r.id, fromUser: r.from_user, toUser: r.to_user, text: r.text, createdAt: r.created_at, readAt: null };
        setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
        void ensureMembers([msg.fromUser]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_requests" }, () => {
        void S.loadRequests(sb, me.id).then((r) => {
          setRequests(r);
          void ensureMembers(r.flatMap((x) => [x.fromUser, x.toUser]));
        });
        void S.loadPartnerships(sb, me.id).then(setPartnerships);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments" }, () => {
        void S.loadAssignments(sb).then((a) => {
          setAssignments(a);
          void ensureMembers(a.flatMap((x) => [x.fromUser, x.toUser ?? ""]));
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, (payload) => {
        const r = payload.new as Record<string, string>;
        const msg: TeamMessage = { id: r.id, teamId: r.team_id, userId: r.user_id, text: r.text, createdAt: r.created_at };
        setTeamMsgs((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
        void ensureMembers([msg.userId]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_invites" }, () => {
        void S.loadMyInvites(sb).then(setMyInvites);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        void S.loadTeams(sb).then((t) => {
          setTeams(t);
          void ensureMembers(t.flatMap((x) => x.members));
        });
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("realtime", status, err?.message);
      });
    });
    return () => {
      cancelled = true;
      if (ch) void sb.removeChannel(ch);
    };
  }, [sb, me.id, loading, ensureMembers]);

  // ------------------------------------------------------------ derived --
  const myPartnerIds = useMemo(() => partnerships.map((p) => (p.aUser === me.id ? p.bUser : p.aUser)), [partnerships, me.id]);
  const hasPartner = myPartnerIds.length > 0;
  const myBadges = useMemo(() => computeBadges(stats, hasPartner), [stats, hasPartner]);
  const isBlocked = useCallback((id: string) => blocked.includes(id), [blocked]);
  const incoming = useMemo(() => requests.filter((r) => r.toUser === me.id && !isBlocked(r.fromUser)), [requests, me.id, isBlocked]);
  const outgoing = useMemo(() => requests.filter((r) => r.fromUser === me.id), [requests, me.id]);
  const myTeams = useMemo(() => teams.filter((t) => t.members.includes(me.id) || t.ownerId === me.id), [teams, me.id]);
  const inMyBossGroup = useCallback((id: string) => teams.some((t) => t.kind === "boss" && (t.members.includes(me.id) || t.ownerId === me.id) && (t.members.includes(id) || t.ownerId === id)), [teams, me.id]);
  const bossSeatIds = useMemo(() => {
    const set: string[] = [];
    teams.forEach((t) => {
      if (t.kind === "boss" && t.ownerId === me.id) t.members.forEach((id) => id !== me.id && !set.includes(id) && set.push(id));
    });
    return set;
  }, [teams, me.id]);
  const seatCount = bossSeatIds.length;
  const seatExtra = Math.max(0, seatCount - SEATS_INCLUDED);
  const assignedToMe = useMemo(() => assignments.filter((a) => a.toUser === me.id && myTeams.some((t) => t.id === a.teamId)), [assignments, me.id, myTeams]);
  const activeChat = chatWith && myPartnerIds.includes(chatWith) ? chatWith : (myPartnerIds[0] ?? null);
  const thread = useMemo(
    () => (activeChat ? messages.filter((m) => !isBlocked(m.fromUser) && ((m.fromUser === me.id && m.toUser === activeChat) || (m.fromUser === activeChat && m.toUser === me.id))) : []),
    [messages, activeChat, me.id, isBlocked],
  );
  const onbItems = useMemo(
    () => [
      { id: "tour", label: "Watch the welcome tour", done: !!me.onboarding.tour },
      { id: "task", label: "Add your first task", done: tasks.length > 0 },
      { id: "check", label: "Check one off", done: stats.totalDone > 0 },
      { id: "hello", label: "Say hi in the community", done: !!me.onboarding.posted },
      { id: "partner", label: "Reach out for a partner", done: myPartnerIds.length > 0 || outgoing.length > 0 },
    ],
    [me.onboarding, tasks.length, stats.totalDone, myPartnerIds.length, outgoing.length],
  );
  const onbDoneCount = onbItems.filter((i) => i.done).length;
  const quote = QUOTES[dayOfYear(today) % QUOTES.length];

  const nameOf = useCallback((id: string | null | undefined) => (id ? (id === me.id ? me.name : (members[id]?.name ?? "Member")) : ""), [members, me.id, me.name]);
  const avatarOf = useCallback((id: string | null | undefined) => (id ? (id === me.id ? me.avatarUrl : (members[id]?.avatarUrl ?? null)) : null), [members, me.id, me.avatarUrl]);
  const stripFor = useCallback(
    (id: string) => {
      if (id === me.id) return { streak: stats.streak, badges: myBadges, level: levelOf(stats.totalDone) };
      const c = cards[id];
      if (!c?.stats) return {};
      const hp = partnerships.some((p) => p.aUser === id || p.bUser === id);
      return { streak: c.stats.streak, badges: computeBadges(c.stats, hp), level: levelOf(c.stats.totalDone) };
    },
    [me.id, stats, myBadges, cards, partnerships],
  );

  // --------------------------------------------------------- ceremonies --
  const announceMilestone = useCallback(
    async (b: Badge) => {
      try {
        const post = await S.addPost(sb, me.id, "win", `${b.e} ${me.name} just earned the ${b.name} badge!`, true);
        setPosts((p) => [post, ...p]);
      } catch (e) {
        console.error(e);
      }
    },
    [sb, me.id, me.name],
  );

  const fireCeremony = useCallback(
    (b: Badge, opts: { line1?: string; line2?: string; kind?: string; announce?: boolean } = {}) => {
      setCeremony({ id: Date.now(), badge: b, line1: opts.line1 || "New badge earned. This is a big deal.", line2: opts.line2 || "Your win was just posted so the community can cheer." });
      setBurst({ id: Date.now() + 1, big: true, kind: opts.kind || "grand" });
      playGrand();
      buzzGrand();
      setTimeout(() => setCeremony(null), 4200);
      if (opts.announce !== false) {
        void announceMilestone(b);
        S.notify(b.id.startsWith("lvl") ? "level" : "badge", me.id, { name: b.name, e: b.e });
      }
    },
    [announceMilestone, me.id],
  );

  const celebrate = useCallback(
    (before: Stats, after: Stats, big: boolean) => {
      const nb = findNewBadge(before, after, hasPartner);
      const lvUp = levelOf(after.totalDone) > levelOf(before.totalDone) ? levelOf(after.totalDone) : 0;
      if (nb) fireCeremony(nb);
      else if (lvUp) fireCeremony({ id: `lvl${lvUp}`, e: "⛰️", name: `Mountain Level ${lvUp}` });
      else {
        buzz(big);
        playChime(big);
        const kinds = ["fireworks", "confetti", "stars", "balloons", "streamers"];
        setBurst({ id: Date.now(), big, kind: kinds[celebRef.current % kinds.length] });
        celebRef.current += 1;
        if (big) {
          setBigMsg(true);
          setTimeout(() => setBigMsg(false), 3600);
        }
      }
    },
    [hasPartner, fireCeremony],
  );

  // Setup-complete ceremony
  useEffect(() => {
    if (loading || me.onboarding.done || onbDoneCount !== onbItems.length) return;
    const onb = me.onboarding;
    const t = setTimeout(() => {
      void saveProfile({ onboarding: { ...onb, done: true } });
      fireCeremony({ id: "onb", e: "🎉", name: "You're all set!" }, { announce: false, kind: "confetti", line1: "Setup complete. Look at you go.", line2: "The whole app is yours now." });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onbDoneCount, loading]);

  // --------------------------------------------------------------- tasks --
  const toggleTask = useCallback(
    (t: Task) => {
      const turningOn = !t.done;
      const list = tasksRef.current;
      const next = list.map((x) => (x.id === t.id ? { ...x, done: turningOn, doneAt: turningOn ? new Date().toISOString() : null } : x));
      let s2 = bumpStats({ block: t.block, big: t.big }, turningOn, next, statsRef.current);
      if (turningOn) s2 = creditPerfectWeek(month, next, t, s2);
      const before = statsRef.current;
      void persistTasks(next, s2);
      if (turningOn) celebrate(before, s2, t.big);
    },
    [month, persistTasks, celebrate],
  );

  const addTask = useCallback(
    (form: NewTaskForm) => {
      const batch = buildNewTasks(month, form, currentWeek);
      if (!batch.length) return;
      const list = tasksRef.current;
      void persistTasks(batch.length > 1 ? organizeList(month, [...list, ...batch]) : [...list, ...batch]);
    },
    [month, currentWeek, persistTasks],
  );

  const organize = useCallback(() => void persistTasks(organizeList(month, tasksRef.current)), [month, persistTasks]);

  const parseDump = useCallback(
    async (text: string) => {
      const span = Math.max(1, month.weekCount - currentWeek + 1);
      const fallback = () =>
        text
          .split(/\n|\.|,|;| and | then /i)
          .map((s) => s.trim())
          .filter((s) => s.length > 2)
          .map((title, i) => ({ title: title.slice(0, 120), week: currentWeek + (i % span), big: false }));
      try {
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "dump", text }) });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "The helper is resting. Split it the simple way for now.");
          return fallback();
        }
        return Array.isArray(data.items) && data.items.length ? data.items : fallback();
      } catch {
        return fallback();
      }
    },
    [month.weekCount, currentWeek, showToast],
  );

  const addDumped = useCallback(
    (items: { title: string; week: number; big: boolean }[]) => {
      if (!items.length) return;
      const fresh: Task[] = items.map((x) => ({ id: uid(), rootId: null, title: x.title, big: x.big, month: month.prefix, week: x.week, date: null, block: "auto", repeat: "none", anchor: null, done: false, doneAt: null, sort: Date.now() }));
      void persistTasks(organizeList(month, [...tasksRef.current, ...fresh]));
    },
    [month, persistTasks],
  );

  const runCommand = useCallback(
    async (spoken?: string) => {
      const text = (typeof spoken === "string" ? spoken : cmdText).trim();
      if (!text || cmdBusy) return;
      setCmdBusy(true);
      setCmdSay("");
      try {
        const brief = tasksRef.current.map((t) => ({ id: t.id, title: t.title, date: t.date, week: taskWeek(month, t), block: t.block, done: t.done, big: !!t.big, repeat: t.repeat || "none" }));
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "command", text, tasks: brief }) });
        const data = await res.json();
        if (!res.ok) {
          setCmdSay(data.error || "That one didn't go through. Say it a little differently and I'll get it.");
        } else {
          const ops = Array.isArray(data.ops) ? data.ops : [];
          if (ops.length) void persistTasks(applyOps(month, tasksRef.current, ops, currentWeek));
          setCmdSay(data.say || (ops.length ? "Done." : "I couldn't match that to anything on the calendar."));
          if (ops.length) setCmdText("");
        }
      } catch {
        setCmdSay("That one didn't go through. Say it a little differently and I'll get it.");
      }
      setCmdBusy(false);
    },
    [cmdText, cmdBusy, month, currentWeek, persistTasks],
  );

  const startListening = useCallback(() => {
    const w = window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setCmdSay("Voice listening isn't supported in this browser. Use the mic on your phone keyboard instead.");
      return;
    }
    if (listening && recogRef.current) {
      recogRef.current.stop();
      return;
    }
    const r = new SR();
    recogRef.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    let finalText = "";
    r.onresult = (ev: SpeechRecognitionEvent) => {
      let txt = "";
      for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      setCmdText(txt);
      if (ev.results[ev.results.length - 1].isFinal) finalText = txt;
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) void runCommand(finalText);
    };
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  }, [listening, runCommand]);

  const saveEdit = useCallback(
    (e: Task) => {
      if (!e.title.trim()) return;
      void persistTasks(applyEdit(month, tasksRef.current, e, currentWeek));
      setEditing(null);
    },
    [month, currentWeek, persistTasks],
  );

  const removeTask = useCallback(
    (id: string) => {
      void persistTasks(tasksRef.current.filter((t) => t.id !== id));
      setEditing(null);
    },
    [persistTasks],
  );

  // ----------------------------------------------------------- encourage --
  const bumpEncourage = useCallback(() => {
    const before = statsRef.current;
    const s2 = { ...before, encourages: (before.encourages || 0) + 1 };
    void persistStats(s2);
    const nb = findNewBadge(before, s2, hasPartner);
    if (nb) fireCeremony(nb);
  }, [persistStats, hasPartner, fireCeremony]);

  // ------------------------------------------------------------ messages --
  const sendMsg = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || !activeChat) return;
      try {
        const msg = await S.sendMessage(sb, me.id, activeChat, t);
        setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
        S.notify("message", activeChat);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, activeChat, fail],
  );

  // ----------------------------------------------------------- community --
  /**
   * Who an @mention points at. Mentions render as a single word, so we match the first
   * word of members' names, preferring people already in the thread, and never the author.
   */
  const mentionTargets = useCallback(
    (text: string, thread: string[]): string[] => {
      const tokens = Array.from(new Set((text.match(/@([\w'-]+)/g) ?? []).map((m) => m.slice(1).toLowerCase())));
      if (!tokens.length) return [];
      const first = (name: string) => (name || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      const out = new Set<string>();
      tokens.forEach((tok) => {
        const inThread = thread.find((id) => id !== me.id && first(members[id]?.name ?? "") === tok);
        if (inThread) return void out.add(inThread);
        const anyone = Object.values(members).find((m) => m.id !== me.id && first(m.name) === tok);
        if (anyone) out.add(anyone.id);
      });
      return Array.from(out);
    },
    [members, me.id],
  );

  const addPost = useCallback(
    async (type: PostType, text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        const post = await S.addPost(sb, me.id, type, t);
        setPosts((p) => [post, ...p]);
        mentionTargets(t, []).forEach((id) => S.notify("mention", id, { name: me.name, snippet: t }));
        if (!me.onboarding.posted) void saveProfile({ onboarding: { ...me.onboarding, posted: true } });
        if (type === "boost") bumpEncourage();
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, me.name, me.onboarding, saveProfile, bumpEncourage, fail, mentionTargets],
  );

  const addReply = useCallback(
    async (postId: string, text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        const r = await S.addReply(sb, me.id, postId, t);
        setPosts((list) => list.map((p) => (p.id === postId ? { ...p, replies: [...p.replies, r] } : p)));
        bumpEncourage();
        const post = posts.find((p) => p.id === postId);
        if (post) {
          const told = new Set<string>();
          if (post.userId !== me.id) {
            told.add(post.userId);
            S.notify("reply", post.userId, { name: me.name, snippet: t });
          }
          const thread = [post.userId, ...post.replies.map((x) => x.userId)];
          mentionTargets(t, thread).forEach((id) => {
            if (!told.has(id)) S.notify("mention", id, { name: me.name, snippet: t });
          });
        }
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, me.name, posts, bumpEncourage, fail, mentionTargets],
  );

  const toggleReact = useCallback(
    async (postId: string, kind: ReactKind) => {
      const post = posts.find((p) => p.id === postId);
      const mine = !!post?.reactions[kind]?.includes(me.id);
      setPosts((list) =>
        list.map((p) => {
          if (p.id !== postId) return p;
          const arr = p.reactions[kind] || [];
          return { ...p, reactions: { ...p.reactions, [kind]: mine ? arr.filter((x) => x !== me.id) : [...arr, me.id] } };
        }),
      );
      try {
        await S.setReaction(sb, me.id, postId, kind, !mine);
        if (!mine) bumpEncourage();
      } catch (e) {
        fail(e);
      }
    },
    [posts, me.id, sb, bumpEncourage, fail],
  );

  // ------------------------------------------------------------ partners --
  const sendRequest = useCallback(
    async (to: string) => {
      if (myPartnerIds.includes(to) || requests.some((r) => (r.fromUser === me.id && r.toUser === to) || (r.fromUser === to && r.toUser === me.id))) return;
      try {
        await S.sendPartnerRequest(sb, me.id, to);
        setRequests(await S.loadRequests(sb, me.id));
        S.notify("partner_request", to);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, myPartnerIds, requests, fail],
  );

  const acceptRequest = useCallback(
    async (r: PartnerRequest) => {
      try {
        await S.acceptPartnerRequest(sb, r);
        const [reqs, pairs] = await Promise.all([S.loadRequests(sb, me.id), S.loadPartnerships(sb, me.id)]);
        setRequests(reqs);
        setPartnerships(pairs);
        await loadCardsFor([r.fromUser]);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, loadCardsFor, fail],
  );

  const declineRequest = useCallback(
    async (r: PartnerRequest) => {
      try {
        await S.declinePartnerRequest(sb, r.id);
        setRequests((list) => list.filter((x) => x.id !== r.id));
      } catch (e) {
        fail(e);
      }
    },
    [sb, fail],
  );

  const endPartnershipAction = useCallback(
    async (partnerId: string) => {
      const p = partnerships.find((x) => (x.aUser === me.id && x.bUser === partnerId) || (x.bUser === me.id && x.aUser === partnerId));
      if (!p) return;
      try {
        await S.endPartnership(sb, p.id);
        setPartnerships((list) => list.filter((x) => x.id !== p.id));
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, partnerships, fail],
  );

  // ------------------------------------------------------------- billing --
  const syncSeats = useCallback((teamId: string) => {
    fetch("/api/stripe/seats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) }).catch(() => {});
  }, []);

  const startCheckout = useCallback(
    async (plan: Plan, interval: "monthly" | "yearly") => {
      try {
        const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, interval }) });
        const data = await res.json();
        if (!res.ok || !data.url) {
          showToast(data.error || "Checkout did not open. Try again in a moment.");
          return;
        }
        window.location.assign(data.url);
      } catch {
        showToast("Checkout did not open. Try again in a moment.");
      }
    },
    [showToast],
  );

  const openPortal = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        showToast(data.error || "Billing did not open. Try again in a moment.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      showToast("Billing did not open. Try again in a moment.");
    }
  }, [showToast]);

  // --------------------------------------------------------------- teams --
  const createTeamAction = useCallback(
    async (name: string) => {
      const n = name.trim();
      if (!n) return;
      try {
        const t = await S.createTeam(sb, me.id, n, plan === "boss" ? "boss" : "standard");
        setTeams((list) => [...list, t]);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, plan, fail],
  );

  const inviteToTeam = useCallback(
    async (teamId: string, email: string) => {
      const em = email.trim().toLowerCase();
      if (!em.includes("@")) return "Enter a valid email address.";
      const team = teams.find((t) => t.id === teamId);
      if (team && team.members.length + outgoingInvites.filter((i) => i.teamId === teamId).length >= TEAM_CAP) return "This team is full.";
      if (outgoingInvites.some((i) => i.teamId === teamId && i.email === em)) return "Already invited.";
      try {
        const inv = await S.inviteByEmail(sb, me.id, teamId, em);
        setOutgoingInvites((list) => [...list, inv]);
        return null;
      } catch (e) {
        fail(e);
        return "Could not send that invite.";
      }
    },
    [sb, me.id, teams, outgoingInvites, fail],
  );

  const answerInvite = useCallback(
    async (inv: TeamInvite, join: boolean) => {
      try {
        if (join) {
          await S.acceptInvite(sb, inv.token);
          if (inv.teamKind === "boss") syncSeats(inv.teamId);
        } else await S.declineInvite(sb, inv.id);
        const [tms, invs] = await Promise.all([S.loadTeams(sb), S.loadMyInvites(sb)]);
        setTeams(tms);
        setMyInvites(invs);
        await ensureMembers(tms.flatMap((t) => t.members));
        await loadCardsFor(tms.flatMap((t) => t.members));
        setTeamMsgs(await S.loadTeamMessages(sb, tms.map((t) => t.id)));
      } catch (e) {
        fail(e);
      }
    },
    [sb, ensureMembers, loadCardsFor, fail, syncSeats],
  );

  const cancelInviteAction = useCallback(
    async (id: string) => {
      await S.cancelInvite(sb, id);
      setOutgoingInvites((list) => list.filter((i) => i.id !== id));
    },
    [sb],
  );

  const leaveTeamAction = useCallback(
    async (teamId: string) => {
      const t = teams.find((x) => x.id === teamId);
      if (!t) return;
      try {
        if (t.ownerId === me.id) await S.deleteTeam(sb, teamId);
        else await S.leaveTeam(sb, me.id, teamId);
        if (t.kind === "boss") syncSeats(t.id);
        setTeams((list) => (t.ownerId === me.id ? list.filter((x) => x.id !== teamId) : list.map((x) => (x.id === teamId ? { ...x, members: x.members.filter((m) => m !== me.id) } : x))));
        if (openTeam === teamId) setOpenTeam(null);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, teams, openTeam, fail, syncSeats],
  );

  const removeMemberAction = useCallback(
    async (teamId: string, userId: string) => {
      try {
        await S.removeMember(sb, teamId, userId);
        setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, members: t.members.filter((m) => m !== userId) } : t)));
        setAssignments(await S.loadAssignments(sb));
        syncSeats(teamId);
      } catch (e) {
        fail(e);
      }
    },
    [sb, fail, syncSeats],
  );

  const reassignTask = useCallback(
    async (id: string, userId: string) => {
      if (!userId) return;
      try {
        await S.updateAssignment(sb, id, { toUser: userId });
        setAssignments((list) => list.map((a) => (a.id === id ? { ...a, toUser: userId } : a)));
        S.notify("assignment", userId);
      } catch (e) {
        fail(e);
      }
    },
    [sb, fail],
  );

  const sendTeamMsg = useCallback(
    async (teamId: string, text: string) => {
      const t = text.trim();
      if (!t) return;
      try {
        const msg = await S.sendTeamMessage(sb, me.id, teamId, t);
        setTeamMsgs((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, fail],
  );

  const assignTask = useCallback(
    async (teamId: string, toUser: string, title: string, date: string | null) => {
      if (!title.trim() || !toUser) return;
      try {
        const a = await S.createAssignment(sb, me.id, teamId, toUser, title.trim(), date);
        setAssignments((list) => [...list, a]);
        S.notify("assignment", toUser);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, fail],
  );

  const toggleAssigned = useCallback(
    async (a: Assignment) => {
      const turningOn = !a.done;
      const doneAt = turningOn ? new Date().toISOString() : null;
      setAssignments((list) => list.map((x) => (x.id === a.id ? { ...x, done: turningOn, doneAt } : x)));
      try {
        await S.updateAssignment(sb, a.id, { done: turningOn, doneAt });
      } catch (e) {
        fail(e);
        return;
      }
      if (a.toUser === me.id) {
        const before = statsRef.current;
        const s2 = bumpStats({ block: null, big: false }, turningOn, tasksRef.current, before);
        void persistStats(s2);
        if (turningOn) celebrate(before, s2, false);
      }
    },
    [sb, me.id, persistStats, celebrate, fail],
  );

  const removeAssigned = useCallback(
    async (id: string) => {
      try {
        await S.deleteAssignment(sb, id);
        setAssignments((list) => list.filter((a) => a.id !== id));
      } catch (e) {
        fail(e);
      }
    },
    [sb, fail],
  );

  // -------------------------------------------------------------- blocks --
  const blockUser = useCallback(
    async (id: string) => {
      if (!id || id === me.id || blocked.includes(id)) return;
      setBlocked((b) => [...b, id]);
      setViewProfile(null);
      try {
        await S.blockMember(sb, me.id, id);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, blocked, fail],
  );

  const unblockUser = useCallback(
    async (id: string) => {
      setBlocked((b) => b.filter((x) => x !== id));
      try {
        await S.unblockMember(sb, me.id, id);
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, fail],
  );

  const reportUser = useCallback(
    async (id: string, reason: string) => {
      try {
        await S.reportMember(sb, me.id, { userId: id }, reason);
        showToast("Thanks. We'll take a look.");
      } catch (e) {
        fail(e);
      }
    },
    [sb, me.id, showToast, fail],
  );

  // -------------------------------------------------------------- account --
  const toggleMute = useCallback(() => {
    const next = !me.muted;
    setSoundOn(!next);
    void saveProfile({ muted: next });
  }, [me.muted, saveProfile]);

  const toggleNotif = useCallback(async () => {
    const next = !me.notifOn;
    await saveProfile({ notifOn: next });
    if (next) {
      const r = await enablePush();
      if (r === "denied") showToast("Your browser blocked notifications. Allow them in its settings to get alerts.");
      if (r === "unsupported") showToast("Install TaDa to your home screen to get notifications on this device.");
    } else {
      await disablePush();
    }
  }, [me.notifOn, saveProfile, showToast]);

  const toggleCommunityNotif = useCallback(async () => {
    await saveProfile({ notifCommunity: !me.notifCommunity });
  }, [me.notifCommunity, saveProfile]);

  const saveAccount = useCallback(
    async (patch: Partial<Pick<MyProfile, "name" | "bio" | "hidden" | "private" | "seeking">>) => {
      await saveProfile(patch);
      setMembers((m) => ({ ...m, [me.id]: { ...(m[me.id] ?? { id: me.id, slug: me.slug, role: me.role, avatarUrl: me.avatarUrl, hidden: me.hidden, private: me.private, seeking: me.seeking, name: me.name }), ...("name" in patch ? { name: patch.name ?? me.name } : {}), ...("hidden" in patch ? { hidden: !!patch.hidden } : {}), ...("private" in patch ? { private: !!patch.private } : {}), ...("seeking" in patch ? { seeking: !!patch.seeking } : {}) } }));
      showToast("Saved.");
    },
    [saveProfile, me, showToast],
  );

  const pickAvatar = useCallback(
    async (file: File) => {
      try {
        const url = await P.uploadAvatar(sb, me.id, file);
        await saveProfile({ avatarUrl: url });
        setMembers((m) => (m[me.id] ? { ...m, [me.id]: { ...m[me.id], avatarUrl: url } } : m));
      } catch (e) {
        fail(e, "That photo didn't upload. Try a JPG or PNG under 5 MB.");
      }
    },
    [sb, me.id, saveProfile, fail],
  );

  const removeAvatarAction = useCallback(async () => {
    await P.removeAvatar(sb, me.id);
    await saveProfile({ avatarUrl: null });
    setMembers((m) => (m[me.id] ? { ...m, [me.id]: { ...m[me.id], avatarUrl: null } } : m));
  }, [sb, me.id, saveProfile]);

  const markTour = useCallback(() => {
    void saveProfile({ onboarding: { ...me.onboarding, tour: true } });
    setShowTour(false);
  }, [me.onboarding, saveProfile]);

  // ------------------------------------------------------------- inbox --
  const unreadCount = useMemo(() => inbox.filter((n) => !n.readAt).length, [inbox]);
  useEffect(() => {
    if (loading) return;
    void loadInbox(sb, me.id).then(setInbox).catch(() => {});
  }, [loading, sb, me.id]);
  const markRead = useCallback(
    async (id: string) => {
      setInbox((list) => list.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)));
      await markNoticeRead(sb, id).catch(() => {});
    },
    [sb],
  );
  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setInbox((list) => list.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    await markAllNoticesRead(sb, me.id).catch(() => {});
  }, [sb, me.id]);

  const value: PlannerState & PlannerActions = {
    sb, me, plan, billing, month, today, currentWeek, loading, tasks, stats, myBadges, members, cards, requests, partnerships, messages, teams, myInvites, outgoingInvites, teamMsgs, assignments, posts, blocked, seekers,
    burst, bigMsg, ceremony, editing, viewProfile, confirmRemove, showTour, onbOpen, showAdd, chatWith, openTeam, refreshing, cmdText, cmdBusy, cmdSay, listening, toast, inbox, inboxOpen, unreadCount,
    myPartnerIds, incoming, outgoing, myTeams, bossSeatIds, seatCount, seatExtra, assignedToMe, activeChat, thread, onbItems, onbDoneCount, quote,
    set, nameOf, avatarOf, stripFor, isBlocked, inMyBossGroup,
    toggleTask, addTask, organize, parseDump, addDumped, runCommand, startListening, saveEdit, removeTask,
    sendMsg, addPost, addReply, toggleReact,
    sendRequest, acceptRequest, declineRequest, endPartnership: endPartnershipAction,
    createTeam: createTeamAction, inviteToTeam, answerInvite, cancelInvite: cancelInviteAction, leaveTeam: leaveTeamAction, removeMember: removeMemberAction, reassignTask, sendTeamMsg, assignTask, toggleAssigned, removeAssigned,
    blockUser, unblockUser, reportUser, toggleMute, toggleNotif, toggleCommunityNotif, saveAccount, pickAvatar, removeAvatar: removeAvatarAction, markTour, refreshShared, loadCardsFor, showToast, markRead, markAllRead, startCheckout, openPortal,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
