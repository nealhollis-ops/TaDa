"use client";

/**
 * Everything between members: member cards, partners, messages, teams,
 * assignments, community, blocks, reports. RLS enforces the privacy rules;
 * these helpers just shape the queries.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Assignment, AssignmentNote, Member, MemberCard, Message, PartnerRequest, Partnership, Post, PostType, Progress, ReactKind, SeatRow, Stats, Team, TeamInvite, TeamMessage } from "@/lib/planner/types";
import { MEMBER_COLS, toAssignment, toAssignmentNote, toMember, toMessage, toPartnership, toPost, toProgress, toReply, toRequest, toStats, toTeam, toTeamMessage } from "./map";

type SB = SupabaseClient;

// -------------------------------------------------------------- members --
export async function loadMembers(sb: SB, ids: string[]): Promise<Member[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return [];
  const { data, error } = await sb.from("profiles").select(MEMBER_COLS).in("id", unique);
  if (error) throw error;
  return (data ?? []).map(toMember);
}

/** Members with their hand raised for a partner (hidden members never appear). */
export async function loadSeekers(sb: SB): Promise<Member[]> {
  const { data, error } = await sb.from("profiles").select(MEMBER_COLS).eq("seeking", true).eq("hidden", false).is("banned_at", null).limit(200);
  if (error) throw error;
  return (data ?? []).map(toMember);
}

/** Stats + this month's progress for a set of members. RLS drops what you may not see. */
export async function loadCards(sb: SB, ids: string[], month: string): Promise<Record<string, { stats: Stats | null; progress: Progress | null }>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const out: Record<string, { stats: Stats | null; progress: Progress | null }> = {};
  if (!unique.length) return out;
  const [{ data: st }, { data: pr }] = await Promise.all([
    sb.from("stats").select("*").in("user_id", unique),
    sb.from("progress").select("*").in("user_id", unique).eq("month", month),
  ]);
  unique.forEach((id) => (out[id] = { stats: null, progress: null }));
  (st ?? []).forEach((r) => (out[r.user_id].stats = toStats(r)));
  (pr ?? []).forEach((r) => (out[r.user_id].progress = toProgress(r)));
  return out;
}

/** The profile modal payload, privacy applied by the database. */
export async function loadProfileCard(sb: SB, id: string): Promise<(MemberCard & { bio: string | null; link: string | null; canView: boolean }) | null> {
  const { data, error } = await sb.rpc("profile_card", { target: id });
  if (error) throw error;
  if (!data) return null;
  const d = data as Record<string, unknown>;
  const st = d.stats as Record<string, number> | null;
  const pr = d.progress as Record<string, unknown> | null;
  return {
    id: d.id as string,
    name: (d.name as string) ?? "",
    slug: (d.slug as string) ?? "",
    avatarUrl: (d.avatar_url as string) ?? null,
    hidden: false,
    private: !!d.private,
    seeking: !!d.seeking,
    role: d.is_admin ? "admin" : "member",
    bio: (d.bio as string) ?? null,
    link: (d.link as string) ?? null,
    canView: !!d.can_view,
    hasPartner: !!d.has_partner,
    stats: st
      ? {
          streak: st.streak ?? 0, bestStreak: st.best_streak ?? 0, totalDone: st.total_done ?? 0, bigDone: st.big_done ?? 0,
          morningDone: st.morning_done ?? 0, perfectWeeks: st.perfect_weeks ?? 0, comebacks: st.comebacks ?? 0, encourages: st.encourages ?? 0,
        }
      : null,
    progress: pr ? { total: (pr.total as number) ?? 0, done: (pr.done as number) ?? 0, weeks: (pr.weeks as Progress["weeks"]) ?? {}, updatedAt: (pr.updated_at as string) ?? "" } : null,
  };
}

// ------------------------------------------------------------- partners --
export async function loadRequests(sb: SB, me: string): Promise<PartnerRequest[]> {
  const { data, error } = await sb.from("partner_requests").select("*").or(`from_user.eq.${me},to_user.eq.${me}`).eq("status", "pending").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toRequest);
}

export async function loadPartnerships(sb: SB, me: string): Promise<Partnership[]> {
  const { data, error } = await sb.from("partnerships").select("*").or(`a_user.eq.${me},b_user.eq.${me}`);
  if (error) throw error;
  return (data ?? []).map(toPartnership);
}

export async function sendPartnerRequest(sb: SB, me: string, to: string) {
  const { error } = await sb.from("partner_requests").insert({ from_user: me, to_user: to });
  if (error) throw error;
}

export async function acceptPartnerRequest(sb: SB, req: PartnerRequest) {
  const a = req.fromUser < req.toUser ? req.fromUser : req.toUser;
  const b = req.fromUser < req.toUser ? req.toUser : req.fromUser;
  const { error: e1 } = await sb.from("partner_requests").update({ status: "accepted" }).eq("id", req.id);
  if (e1) throw e1;
  const { error: e2 } = await sb.from("partnerships").upsert({ a_user: a, b_user: b }, { onConflict: "a_user,b_user", ignoreDuplicates: true });
  if (e2) throw e2;
}

export async function declinePartnerRequest(sb: SB, id: string) {
  const { error } = await sb.from("partner_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function endPartnership(sb: SB, id: string) {
  const { error } = await sb.from("partnerships").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------- messages --
export async function loadMessages(sb: SB, me: string): Promise<Message[]> {
  const { data, error } = await sb.from("messages").select("*").or(`from_user.eq.${me},to_user.eq.${me}`).order("created_at", { ascending: false }).limit(400);
  if (error) throw error;
  return (data ?? []).map(toMessage).reverse();
}

export async function sendMessage(sb: SB, me: string, to: string, text: string): Promise<Message> {
  const { data, error } = await sb.from("messages").insert({ from_user: me, to_user: to, text }).select("*").single();
  if (error) throw error;
  return toMessage(data);
}

/** Mark everything a member sent me as read. */
export async function markThreadRead(sb: SB, me: string, from: string) {
  const { error } = await sb.from("messages").update({ read_at: new Date().toISOString() }).eq("to_user", me).eq("from_user", from).is("read_at", null);
  if (error) throw error;
}

// ----------------------------------------------------------- room reads --
export async function loadTeamReads(sb: SB, me: string): Promise<Record<string, string>> {
  const { data, error } = await sb.from("team_room_reads").select("team_id,read_at").eq("user_id", me);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r) => [r.team_id as string, r.read_at as string]));
}

export async function markTeamRead(sb: SB, me: string, teamId: string, at: string) {
  const { error } = await sb.from("team_room_reads").upsert({ team_id: teamId, user_id: me, read_at: at }, { onConflict: "team_id,user_id" });
  if (error) throw error;
}

// ---------------------------------------------------------------- teams --
export async function loadTeams(sb: SB): Promise<Team[]> {
  const { data: teams, error } = await sb.from("teams").select("*").order("created_at");
  if (error) throw error;
  const ids = (teams ?? []).map((t) => t.id);
  const membersByTeam: Record<string, string[]> = {};
  if (ids.length) {
    const { data: tm } = await sb.from("team_members").select("team_id,user_id,joined_at").in("team_id", ids).order("joined_at");
    (tm ?? []).forEach((r) => {
      (membersByTeam[r.team_id] ||= []).push(r.user_id);
    });
  }
  return (teams ?? []).map((t) => {
    const members = membersByTeam[t.id] ?? [];
    if (!members.includes(t.owner_id)) members.unshift(t.owner_id);
    return toTeam(t, members);
  });
}

export async function createTeam(sb: SB, me: string, name: string, kind: "standard" | "boss"): Promise<Team> {
  const { data, error } = await sb.from("teams").insert({ name: name.slice(0, 40), kind, owner_id: me }).select("*").single();
  if (error) throw error;
  await sb.from("team_members").insert({ team_id: data.id, user_id: me });
  return toTeam(data, [me]);
}

export async function loadOutgoingInvites(sb: SB, teamIds: string[]): Promise<TeamInvite[]> {
  if (!teamIds.length) return [];
  const { data, error } = await sb.from("team_invites").select("*").in("team_id", teamIds).is("accepted_at", null).gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, teamId: r.team_id, email: r.email, token: r.token, invitedBy: r.invited_by, acceptedAt: r.accepted_at, createdAt: r.created_at }));
}

export async function loadMyInvites(sb: SB): Promise<TeamInvite[]> {
  const { data, error } = await sb.rpc("my_team_invites");
  if (error) throw error;
  return ((data ?? []) as Record<string, string>[]).map((r) => ({
    id: r.id, teamId: r.team_id, email: "", token: r.token, invitedBy: r.invited_by, acceptedAt: null, createdAt: r.created_at,
    teamName: r.team_name, teamKind: r.team_kind as "standard" | "boss",
  }));
}

export async function inviteByEmail(sb: SB, me: string, teamId: string, email: string): Promise<TeamInvite> {
  const { data, error } = await sb.from("team_invites").insert({ team_id: teamId, email: email.trim().toLowerCase(), invited_by: me }).select("*").single();
  if (error) throw error;
  // Email goes out from the server (holds the Resend key).
  await fetch("/api/invites/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteId: data.id }) }).catch(() => {});
  return { id: data.id, teamId: data.team_id, email: data.email, token: data.token, invitedBy: data.invited_by, acceptedAt: null, createdAt: data.created_at };
}

export async function acceptInvite(sb: SB, token: string): Promise<string> {
  const { data, error } = await sb.rpc("accept_team_invite", { p_token: token });
  if (error) throw error;
  return data as string;
}

export async function declineInvite(sb: SB, id: string) {
  const { error } = await sb.rpc("decline_team_invite", { p_id: id });
  if (error) throw error;
}

export async function cancelInvite(sb: SB, id: string) {
  await sb.from("team_invites").delete().eq("id", id);
}

export async function leaveTeam(sb: SB, me: string, teamId: string) {
  const { error } = await sb.from("team_members").delete().eq("team_id", teamId).eq("user_id", me);
  if (error) throw error;
}

export async function deleteTeam(sb: SB, teamId: string) {
  const { error } = await sb.from("teams").delete().eq("id", teamId);
  if (error) throw error;
}

/** Boss removes a member: done assignments go, unfinished ones drop into the holding tank. */
export async function removeMember(sb: SB, teamId: string, userId: string) {
  const { error } = await sb.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) throw error;
  await sb.from("assignments").delete().eq("team_id", teamId).eq("to_user", userId).eq("done", true);
  await sb.from("assignments").update({ to_user: null }).eq("team_id", teamId).eq("to_user", userId).eq("done", false);
}

export async function loadSeatRoster(sb: SB): Promise<SeatRow[]> {
  const { data, error } = await sb.rpc("boss_seat_roster");
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string, name: r.name as string, avatarUrl: (r.avatar_url as string) ?? null, email: r.email as string, teamNames: (r.team_names as string[]) ?? [],
  }));
}

// -------------------------------------------------------- team messages --
export async function loadTeamMessages(sb: SB, teamIds: string[]): Promise<TeamMessage[]> {
  if (!teamIds.length) return [];
  const { data, error } = await sb.from("team_messages").select("*").in("team_id", teamIds).order("created_at", { ascending: false }).limit(600);
  if (error) throw error;
  return (data ?? []).map(toTeamMessage).reverse();
}

export async function sendTeamMessage(sb: SB, me: string, teamId: string, text: string): Promise<TeamMessage> {
  const { data, error } = await sb.from("team_messages").insert({ team_id: teamId, user_id: me, text }).select("*").single();
  if (error) throw error;
  return toTeamMessage(data);
}

// ---------------------------------------------------------- assignments --
export async function loadAssignments(sb: SB): Promise<Assignment[]> {
  const { data, error } = await sb.from("assignments").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toAssignment);
}

/** Notes on every assignment this member can see; RLS decides which those are. */
export async function loadAssignmentNotes(sb: SB): Promise<AssignmentNote[]> {
  const { data, error } = await sb.from("assignment_notes").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map(toAssignmentNote);
}

export async function addAssignmentNote(sb: SB, me: string, assignmentId: string, text: string): Promise<AssignmentNote> {
  const { data, error } = await sb.from("assignment_notes").insert({ assignment_id: assignmentId, user_id: me, text: text.slice(0, 1000) }).select("*").single();
  if (error) throw error;
  return toAssignmentNote(data);
}

export async function createAssignment(sb: SB, me: string, teamId: string, toUser: string, title: string, date: string | null): Promise<Assignment> {
  const { data, error } = await sb.from("assignments").insert({ team_id: teamId, from_user: me, to_user: toUser, title: title.slice(0, 120), date }).select("*").single();
  if (error) throw error;
  return toAssignment(data);
}

export async function updateAssignment(sb: SB, id: string, patch: { done?: boolean; doneAt?: string | null; toUser?: string | null; title?: string; date?: string | null }) {
  const row: Record<string, unknown> = {};
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.doneAt !== undefined) row.done_at = patch.doneAt;
  if (patch.toUser !== undefined) row.to_user = patch.toUser;
  if (patch.title !== undefined) row.title = patch.title.slice(0, 120);
  if (patch.date !== undefined) row.date = patch.date;
  const { error } = await sb.from("assignments").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteAssignment(sb: SB, id: string) {
  const { error } = await sb.from("assignments").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------ community --
export async function loadPosts(sb: SB): Promise<Post[]> {
  const { data: posts, error } = await sb.from("posts").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  const ids = (posts ?? []).map((p) => p.id);
  const repliesBy: Record<string, ReturnType<typeof toReply>[]> = {};
  const reactionsBy: Record<string, Record<string, string[]>> = {};
  if (ids.length) {
    const [{ data: replies }, { data: reactions }] = await Promise.all([
      sb.from("replies").select("*").in("post_id", ids).is("deleted_at", null).order("created_at"),
      sb.from("reactions").select("post_id,user_id,kind").in("post_id", ids),
    ]);
    const replyIds = (replies ?? []).map((r) => r.id);
    const rr: Record<string, Record<string, string[]>> = {};
    if (replyIds.length) {
      const { data: replyReacts } = await sb.from("reply_reactions").select("reply_id,user_id,kind").in("reply_id", replyIds);
      (replyReacts ?? []).forEach((r) => {
        const m = (rr[r.reply_id] ||= {});
        (m[r.kind] ||= []).push(r.user_id);
      });
    }
    (replies ?? []).forEach((r) => (repliesBy[r.post_id] ||= []).push(toReply(r, rr[r.id] ?? {})));
    (reactions ?? []).forEach((r) => {
      const m = (reactionsBy[r.post_id] ||= {});
      (m[r.kind] ||= []).push(r.user_id);
    });
  }
  return (posts ?? []).map((p) => toPost(p, repliesBy[p.id] ?? [], reactionsBy[p.id] ?? {}));
}

export async function addPost(sb: SB, me: string, type: PostType, text: string, milestone = false): Promise<Post> {
  const { data, error } = await sb.from("posts").insert({ user_id: me, type, text, milestone }).select("*").single();
  if (error) throw error;
  return toPost(data, [], {});
}

export async function addReply(sb: SB, me: string, postId: string, text: string) {
  const { data, error } = await sb.from("replies").insert({ post_id: postId, user_id: me, text }).select("*").single();
  if (error) throw error;
  return toReply(data);
}

export async function setReaction(sb: SB, me: string, postId: string, kind: ReactKind, on: boolean) {
  if (on) {
    const { error } = await sb.from("reactions").upsert({ post_id: postId, user_id: me, kind }, { onConflict: "post_id,user_id,kind", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await sb.from("reactions").delete().eq("post_id", postId).eq("user_id", me).eq("kind", kind);
    if (error) throw error;
  }
}

export async function softDeletePost(sb: SB, id: string) {
  const { error } = await sb.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function softDeleteReply(sb: SB, id: string) {
  const { error } = await sb.from("replies").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function editPost(sb: SB, id: string, text: string) {
  const { error } = await sb.from("posts").update({ text, edited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

/** Admin only in practice: the posts update policy is what lets this through. */
export async function setPostPinned(sb: SB, id: string, pinned: boolean) {
  const { error } = await sb.from("posts").update({ pinned }).eq("id", id);
  if (error) throw error;
}

export async function editReply(sb: SB, id: string, text: string) {
  const { error } = await sb.from("replies").update({ text, edited_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function setReplyReaction(sb: SB, me: string, replyId: string, kind: ReactKind, on: boolean) {
  if (on) {
    const { error } = await sb.from("reply_reactions").upsert({ reply_id: replyId, user_id: me, kind }, { onConflict: "reply_id,user_id,kind", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { error } = await sb.from("reply_reactions").delete().eq("reply_id", replyId).eq("user_id", me).eq("kind", kind);
    if (error) throw error;
  }
}

// --------------------------------------------------------------- blocks --
export async function loadBlocks(sb: SB, me: string): Promise<string[]> {
  const { data, error } = await sb.from("blocks").select("blocked_id").eq("blocker_id", me);
  if (error) throw error;
  return (data ?? []).map((r) => r.blocked_id);
}

export async function blockMember(sb: SB, me: string, id: string) {
  const { error } = await sb.from("blocks").upsert({ blocker_id: me, blocked_id: id }, { ignoreDuplicates: true });
  if (error) throw error;
}

export async function unblockMember(sb: SB, me: string, id: string) {
  const { error } = await sb.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", id);
  if (error) throw error;
}

export async function reportMember(sb: SB, me: string, target: { userId?: string; postId?: string; replyId?: string }, reason: string) {
  const { error } = await sb.from("reports").insert({ reporter_id: me, target_user_id: target.userId ?? null, post_id: target.postId ?? null, reply_id: target.replyId ?? null, reason: reason.slice(0, 500) });
  if (error) throw error;
}

// ---------------------------------------------------------------- push --
/** Fire-and-forget: ask the server to push a notification to another member. */
export function notify(kind: "message" | "partner_request" | "team_invite" | "assignment" | "assignment_note" | "badge" | "level" | "reply" | "mention", toUser: string, extra: Record<string, string> = {}) {
  fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, toUser, ...extra }) }).catch(() => {});
}
