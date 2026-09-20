"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Pencil, RefreshCw, Send, Trash2, X } from "lucide-react";
import { usePlanner } from "../store";
import { Avatar, BadgeStrip, Bar, C, QuoteCard, inputCls, inputStyle, renderRich } from "../ui";
import { ago, dayLabel, dstr } from "@/lib/planner/calendar";
import { levelOf, QUOTES, SEATS_INCLUDED, TEAM_CAP } from "@/lib/planner/content";
import type { Assignment, Team, TeamInvite } from "@/lib/planner/types";

type Tab = "partners" | "teams" | "boss";

/**
 * Partners is three tabs. Partners is for everyone. Teams appears for the Teams
 * and Boss plans, and for anyone who has been invited to or joined a plain team
 * (their team owner's plan covers them). Boss Mode appears for the Boss plan and
 * for members of a boss team, who get the member view.
 */
export function PartnersScreen() {
  const p = usePlanner();
  const [tab, setTab] = useState<Tab>("partners");

  const plainTeams = p.myTeams.filter((t) => t.kind !== "boss");
  const bossTeams = p.myTeams.filter((t) => t.kind === "boss");
  const plainInvites = p.myInvites.filter((i) => i.teamKind !== "boss");
  const bossInvites = p.myInvites.filter((i) => i.teamKind === "boss");
  const showTeams = p.plan !== "standard" || plainTeams.length > 0 || plainInvites.length > 0;
  const showBoss = p.plan === "boss" || bossTeams.length > 0 || bossInvites.length > 0;
  const tabs: [Tab, string][] = [["partners", "Partners"]];
  if (showTeams) tabs.push(["teams", "Teams"]);
  if (showBoss) tabs.push(["boss", "Boss Mode"]);
  const active: Tab = tabs.some(([id]) => id === tab) ? tab : "partners";

  return (
    <div className="px-5 py-5">
      <QuoteCard q={QUOTES[QUOTES.length - 1]} />
      {tabs.length > 1 && (
        <div className="mb-4 flex rounded-xl p-1" style={{ background: C.mist }}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 rounded-lg py-2 text-sm font-semibold"
              style={{ background: active === id ? "#fff" : "transparent", color: active === id ? C.ink : C.fade, boxShadow: active === id ? "0 1px 2px rgba(17,17,17,0.12)" : "none" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {active === "partners" && <PartnersTab />}
      {active === "teams" && <TeamsTab teams={plainTeams} invites={plainInvites} />}
      {active === "boss" && <BossTab teams={bossTeams} invites={bossInvites} />}
    </div>
  );
}

function RefreshButton({ label }: { label: string }) {
  const p = usePlanner();
  return (
    <button onClick={() => void p.refreshShared()} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-sm" style={{ background: "#fff", color: C.navy, border: `1px solid ${C.line}` }} aria-label={label}>
      <RefreshCw size={18} style={{ color: C.coral }} className={p.refreshing ? "animate-spin" : ""} />
      {p.refreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}

// ---------------------------------------------------------------- Partners --

function PartnersTab() {
  const p = usePlanner();
  const [msgText, setMsgText] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [p.thread.length]);

  const meCard = p.cards[p.me.id];
  const mpct = meCard?.progress?.total ? Math.round((meCard.progress.done / meCard.progress.total) * 100) : 0;
  const canAddPartner = p.plan !== "standard" || p.myPartnerIds.length < 1;
  const seekers = p.seekers.filter((s) => s.id !== p.me.id && !p.isBlocked(s.id) && !p.myPartnerIds.includes(s.id));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.navy }}>
          Your circle
        </h2>
        <RefreshButton label="Refresh partners" />
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        Partners see each other&rsquo;s weekly and monthly progress only. Nobody sees anyone&rsquo;s actual tasks. Not even a partner.
      </p>

      <div className="mb-3 rounded-2xl p-4" style={{ background: C.goldSoft }}>
        <div className="mb-2 flex items-center gap-2">
          <Avatar src={p.me.avatarUrl} name={p.me.name} size={28} />
          <span className="text-sm font-bold" style={{ color: C.navy }}>
            {p.me.name} (you)
          </span>
          <BadgeStrip streak={p.stats.streak} badges={p.myBadges} level={levelOf(p.stats.totalDone)} />
          <span className="flex-1" />
          <span className="text-xs" style={{ color: C.fade }}>
            {mpct}%
          </span>
        </div>
        <Bar pct={mpct} color={C.teal} bg="#fff" />
      </div>

      {p.incoming.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-bold" style={{ color: C.navy }}>
            Requests for you
          </h3>
          {p.incoming.map((r) => (
            <div key={r.id} className="mb-2 flex items-center gap-2 rounded-2xl p-3" style={{ background: "#fff", border: `1px solid ${C.coral}` }}>
              <span className="flex-1 text-sm" style={{ color: C.ink }}>
                <span className="font-bold">{p.nameOf(r.fromUser)}</span> wants to be your accountability partner.
              </span>
              {!canAddPartner ? (
                <Link href="/account" className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.mist, color: C.fade }}>
                  Upgrade to add
                </Link>
              ) : (
                <button onClick={() => void p.acceptRequest(r)} className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.teal, color: C.ink }}>
                  Accept
                </button>
              )}
              <button onClick={() => void p.declineRequest(r)} className="rounded-xl px-2 py-1.5" style={{ background: C.mist }} aria-label="Decline">
                <X size={14} style={{ color: C.fade }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="mb-2 text-sm font-bold" style={{ color: C.navy }}>
        Your partners
      </h3>
      {p.myPartnerIds.length === 0 && (
        <div className="mb-3 rounded-2xl p-4 text-sm" style={{ background: "#fff", color: C.fade }}>
          No partners yet. Ask someone below, or flip on &ldquo;I&rsquo;m looking for a partner&rdquo; in your Account so others can choose you.
        </div>
      )}
      {p.myPartnerIds.map((id) => {
        const c = p.cards[id];
        const pr = c?.progress ?? null;
        const ppct = pr && pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
        const strip = p.stripFor(id);
        return (
          <div key={id} className="mb-3 rounded-2xl p-4" style={{ background: "#fff", border: `2px solid ${C.teal}` }}>
            <div className="mb-2 flex items-center gap-2">
              <button onClick={() => p.set("viewProfile", id)} className="flex items-center gap-2">
                <Avatar src={p.avatarOf(id)} name={p.nameOf(id)} size={28} />
                <span className="text-sm font-bold" style={{ color: C.navy }}>
                  {p.nameOf(id)}
                </span>
              </button>
              <BadgeStrip streak={strip.streak} badges={strip.badges} level={strip.level} />
              <span className="flex-1" />
              <span className="text-xs" style={{ color: C.fade }}>
                {pr ? ago(pr.updatedAt) : "no activity yet"}
              </span>
            </div>
            {pr ? (
              <div>
                <div className="mb-1 text-xs" style={{ color: C.ink }}>
                  {pr.done} of {pr.total} this month, {ppct}%
                </div>
                <Bar pct={ppct} color={C.teal} />
                <div className="mt-2 flex gap-1.5">
                  {p.month.weeks.map((wk) => {
                    const wd = pr.weeks[String(wk.w)] || { done: 0, total: 0 };
                    const wpct = wd.total ? (wd.done / wd.total) * 100 : 0;
                    return (
                      <div key={wk.w} className="flex-1">
                        <Bar pct={wpct} color={C.gold} h={6} />
                        <div className="mt-0.5 text-center" style={{ fontSize: 9, color: C.fade }}>
                          {wk.short}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-xs" style={{ color: C.fade }}>
                They haven&rsquo;t opened the app this month yet.
              </div>
            )}
            <button onClick={() => void p.endPartnership(id)} className="mt-2 text-xs" style={{ color: C.fade, textDecoration: "underline" }}>
              End partnership
            </button>
          </div>
        );
      })}

      <h3 className="mb-2 mt-4 text-sm font-bold" style={{ color: C.navy }}>
        Looking for a partner
      </h3>
      {seekers.length === 0 ? (
        <div className="mb-3 rounded-2xl p-4 text-sm" style={{ background: "#fff", color: C.fade }}>
          Nobody has their hand raised right now. Raise yours in Account and someone can choose you.
        </div>
      ) : (
        seekers.map((s) => {
          const asked = p.outgoing.some((r) => r.toUser === s.id);
          const disabled = asked || !canAddPartner;
          const strip = p.stripFor(s.id);
          return (
            <div key={s.id} className="mb-2 flex items-center gap-2 rounded-2xl p-3" style={{ background: "#fff" }}>
              <button onClick={() => p.set("viewProfile", s.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Avatar src={s.avatarUrl} name={s.name} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: C.navy }}>
                      {s.name}
                    </span>
                    <BadgeStrip streak={strip.streak} badges={strip.badges} level={strip.level} />
                  </div>
                </div>
              </button>
              <button onClick={() => void p.sendRequest(s.id)} disabled={disabled} className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: disabled ? "#FDE2E2" : C.navy, color: disabled ? C.fade : C.cream }}>
                {asked ? "Asked" : !canAddPartner ? "Upgrade to add" : "Ask to partner"}
              </button>
            </div>
          );
        })
      )}

      <h3 className="mb-1 mt-6 text-base font-bold" style={{ color: C.navy }}>
        Messages
      </h3>
      <p className="mb-2 text-xs" style={{ color: C.fade }}>
        Messaging is between partners only.
      </p>
      {p.myPartnerIds.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {p.myPartnerIds.map((id) => (
            <button key={id} onClick={() => p.set("chatWith", id)} className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: p.activeChat === id ? C.navy : "#fff", color: p.activeChat === id ? C.cream : C.ink }}>
              {p.nameOf(id)}
            </button>
          ))}
        </div>
      )}
      <div className="mb-3 rounded-2xl p-3" style={{ background: "#fff", maxHeight: 300, overflowY: "auto" }}>
        {p.thread.length === 0 && (
          <div className="py-4 text-center text-xs" style={{ color: C.fade }}>
            {p.activeChat ? "No messages yet. Send the first one." : "Messaging unlocks when you have a partner."}
          </div>
        )}
        {p.thread.slice(-80).map((m) => {
          const mine = m.fromUser === p.me.id;
          return (
            <div key={m.id} className={`mb-2 flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {!mine && (
                <button onClick={() => p.set("viewProfile", m.fromUser)}>
                  <Avatar src={p.avatarOf(m.fromUser)} name={p.nameOf(m.fromUser)} size={22} />
                </button>
              )}
              <div className="max-w-xs rounded-2xl px-3 py-2" style={{ background: mine ? C.navy : C.cream }}>
                {!mine && (
                  <div className="mb-0.5 text-xs font-semibold" style={{ color: C.gold }}>
                    {p.nameOf(m.fromUser)}
                  </div>
                )}
                <div className="text-sm" style={{ color: mine ? C.cream : C.ink }}>
                  {renderRich(m.text)}
                </div>
                <div className="text-right" style={{ color: mine ? C.goldSoft : C.fade, fontSize: 10 }}>
                  {ago(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEnd} />
      </div>
      <div className="flex gap-2">
        <input
          className={inputCls}
          style={inputStyle}
          placeholder={p.activeChat ? `Message ${p.nameOf(p.activeChat)}...` : "Add a partner to start messaging"}
          disabled={!p.activeChat}
          value={msgText}
          onChange={(e) => setMsgText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void p.sendMsg(msgText);
              setMsgText("");
            }
          }}
        />
        <button
          onClick={() => {
            void p.sendMsg(msgText);
            setMsgText("");
          }}
          className="rounded-xl px-4"
          style={{ background: C.gold }}
          aria-label="Send"
        >
          <Send size={18} style={{ color: C.navy }} />
        </button>
      </div>
      <p className="mt-3 text-xs" style={{ color: C.fade }}>
        Messages arrive live. If something looks stale, tap Refresh.
      </p>

      {p.plan === "standard" && (
        <div className="mt-5 rounded-2xl p-4" style={{ background: C.navy }}>
          <div className="mb-1 text-sm font-bold" style={{ color: C.gold }}>
            Part of the Teams upgrade
          </div>
          <p className="mb-2 text-xs" style={{ color: C.goldSoft }}>
            Named groups with their own discussion, a team progress view, and more than one accountability partner.
          </p>
          <Link href="/account" className="inline-block rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>
            See the upgrade in Account
          </Link>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- Teams --

function InviteCards({ invites }: { invites: TeamInvite[] }) {
  const p = usePlanner();
  return (
    <>
      {invites.map((inv) => (
        <div key={inv.id} className="mb-2 flex items-center gap-2 rounded-2xl p-3" style={{ background: "#fff", border: `1px solid ${C.coral}` }}>
          <span className="flex-1 text-sm" style={{ color: C.ink }}>
            You&rsquo;re invited to <span className="font-bold">{inv.teamName}</span>.
            {inv.teamKind === "boss" && (
              <span className="mt-1 block text-xs" style={{ color: C.fade }}>
                Boss team: the owner assigns tasks, sees their status, and sets deadlines. Hidden and private settings don&rsquo;t apply inside this team, and your signup email is shared with the team owner. Your personal task list stays yours.
              </span>
            )}
          </span>
          <button onClick={() => void p.answerInvite(inv, true)} className="rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.teal, color: C.ink }}>
            Join
          </button>
          <button onClick={() => void p.answerInvite(inv, false)} className="rounded-xl px-2 py-1.5" style={{ background: C.mist }} aria-label="Decline">
            <X size={14} style={{ color: C.fade }} />
          </button>
        </div>
      ))}
    </>
  );
}

function CreateTeamBox({ placeholder }: { placeholder: string }) {
  const p = usePlanner();
  const [teamName, setTeamName] = useState("");
  const create = () => {
    void p.createTeam(teamName);
    setTeamName("");
  };
  return (
    <div className="mb-3 flex gap-2 rounded-2xl p-3" style={{ background: "#fff" }}>
      <input
        className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
        style={inputStyle}
        placeholder={placeholder}
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") create();
        }}
      />
      <button onClick={create} className="rounded-xl px-3 text-xs font-semibold" style={{ background: C.navy, color: C.cream }}>
        Create
      </button>
    </div>
  );
}

function TeamsTab({ teams, invites }: { teams: Team[]; invites: TeamInvite[] }) {
  const p = usePlanner();
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.navy }}>
          Teams
        </h2>
        <RefreshButton label="Refresh teams" />
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        Named groups with their own room and a progress view. Teammates see each other&rsquo;s progress numbers, never the tasks.
      </p>
      <InviteCards invites={invites} />
      {p.plan === "teams" && <CreateTeamBox placeholder="Name a new team..." />}
      {p.plan === "boss" && (
        <p className="mb-3 text-xs" style={{ color: C.fade }}>
          Teams you create are boss teams. Find them under Boss Mode.
        </p>
      )}
      {teams.length === 0 && invites.length === 0 && (
        <div className="mb-3 rounded-2xl p-4 text-sm" style={{ background: "#fff", color: C.fade }}>
          {p.plan === "teams" ? "No teams yet. Name one above and invite people by email." : "You're not on a team yet."}
        </div>
      )}
      {teams.map((t) => (
        <TeamCard key={t.id} t={t} />
      ))}
    </div>
  );
}

// --------------------------------------------------------------- Boss Mode --

function BossTab({ teams, invites }: { teams: Team[]; invites: TeamInvite[] }) {
  const p = usePlanner();
  const boss = p.plan === "boss";
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.navy }}>
          Boss Mode
        </h2>
        <RefreshButton label="Refresh boss teams" />
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        {boss ? "Your boss teams. Assign work with deadlines, watch it get done, and change anything after the fact." : "Work your boss has assigned to you. Your personal task list stays yours."}
      </p>
      <InviteCards invites={invites} />
      {boss && (
        <div className="mb-3 rounded-2xl p-3" style={{ background: "#fff" }}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold" style={{ color: C.navy2 }}>
              Boss seats
            </span>
            <span style={{ color: p.seatExtra > 0 ? C.coral : C.fade }}>
              {p.seatCount} of {SEATS_INCLUDED} included{p.seatExtra > 0 ? `, ${p.seatExtra} extra at $9` : ""}
            </span>
          </div>
          <Bar pct={Math.min(100, (p.seatCount / SEATS_INCLUDED) * 100)} color={p.seatExtra > 0 ? C.coral : C.teal} h={6} />
        </div>
      )}
      {boss && <CreateTeamBox placeholder="Name a new boss team..." />}
      {teams.length === 0 && invites.length === 0 && (
        <div className="mb-3 rounded-2xl p-4 text-sm" style={{ background: "#fff", color: C.fade }}>
          {boss ? "No boss teams yet. Name one above and invite your people by email." : "You're not on a boss team yet."}
        </div>
      )}
      {teams.map((t) => (
        <TeamCard key={t.id} t={t} />
      ))}
    </div>
  );
}

// --------------------------------------------------------------- Team card --

function TeamCard({ t }: { t: Team }) {
  const p = usePlanner();
  const open = p.openTeam === t.id;
  const owner = t.ownerId === p.me.id;
  const [inviteText, setInviteText] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [teamMsgText, setTeamMsgText] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDay, setAssignDay] = useState("none");
  const tMsgs = p.teamMsgs.filter((m) => m.teamId === t.id && !p.isBlocked(m.userId));
  const pending = p.outgoingInvites.filter((i) => i.teamId === t.id);
  const tank = p.assignments.filter((a) => a.teamId === t.id && !a.toUser);
  const border = t.kind === "boss" ? C.coral : C.gold;

  const invite = async () => {
    const err = await p.inviteToTeam(t.id, inviteText);
    setInviteMsg(err ?? "Invitation sent.");
    if (!err) setInviteText("");
  };

  return (
    <div className="mb-3 rounded-2xl p-4" style={{ background: "#fff", border: `2px solid ${border}` }}>
      <button onClick={() => p.set("openTeam", open ? null : t.id)} className="flex w-full items-center justify-between">
        <span className="text-sm font-bold" style={{ color: C.navy }}>
          {t.name}
        </span>
        <span className="text-xs" style={{ color: C.fade }}>
          {t.kind === "boss" && !owner ? `Boss: ${p.nameOf(t.ownerId)}` : `${t.members.length} of ${TEAM_CAP}`}
        </span>
      </button>
      {open && (
        <div className="mt-3">
          {t.members.map((id) => {
            const pr = p.cards[id]?.progress;
            const mpct = pr && pr.total ? Math.round((pr.done / pr.total) * 100) : 0;
            return (
              <div key={id} className="mb-2">
                <div className="mb-1 flex items-center gap-2 text-xs" style={{ color: C.ink }}>
                  <button onClick={() => p.set("viewProfile", id)} className="flex-1 text-left font-semibold" style={{ color: C.ink }}>
                    {p.nameOf(id)}
                    {id === p.me.id ? " (you)" : ""}
                    {id === t.ownerId ? " · owner" : ""}
                  </button>
                  <span style={{ color: C.fade }}>{pr ? `${mpct}%` : "no data"}</span>
                  {owner && id !== p.me.id && (
                    <button onClick={() => p.set("confirmRemove", { teamId: t.id, userId: id, name: p.nameOf(id), teamName: t.name })} aria-label="Remove member">
                      <X size={12} style={{ color: C.coral }} />
                    </button>
                  )}
                </div>
                <Bar pct={mpct} color={C.teal} h={6} />
              </div>
            );
          })}
          {owner && (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                  placeholder="Invite by email..."
                  type="email"
                  value={inviteText}
                  onChange={(e) => setInviteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void invite();
                  }}
                />
                <button onClick={() => void invite()} className="rounded-xl px-3 text-xs font-semibold" style={{ background: C.teal, color: C.ink }}>
                  Invite
                </button>
              </div>
              {inviteMsg && (
                <p className="mt-1 text-xs" style={{ color: C.fade }}>
                  {inviteMsg}
                </p>
              )}
            </div>
          )}
          {pending.length > 0 && (
            <p className="mt-2 text-xs" style={{ color: C.fade }}>
              Waiting on: {pending.map((i) => i.email).join(", ")}
              {owner && (
                <>
                  {" "}
                  ·{" "}
                  {pending.map((i) => (
                    <button key={i.id} onClick={() => void p.cancelInvite(i.id)} className="underline">
                      cancel {i.email.split("@")[0]}
                    </button>
                  ))}
                </>
              )}
            </p>
          )}
          {t.kind === "boss" && owner && (
            <div className="mt-3">
              <SectionLabel>Assign work</SectionLabel>
              <div className="mb-2 rounded-xl p-3" style={{ background: C.cream }}>
                <select className="mb-2 w-full rounded-xl border px-2 py-2 text-sm" style={inputStyle} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                  <option value="">Assign to...</option>
                  {t.members
                    .filter((id) => id !== p.me.id)
                    .map((id) => (
                      <option key={id} value={id}>
                        {p.nameOf(id)}
                      </option>
                    ))}
                </select>
                <input className="mb-2 w-full rounded-xl border px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="What needs doing?" value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} />
                <div className="flex gap-2">
                  <DaySelect value={assignDay} onChange={setAssignDay} />
                  <button
                    onClick={() => {
                      void p.assignTask(t.id, assignTo, assignTitle, assignDay === "none" ? null : dstr(p.month, parseInt(assignDay, 10)));
                      setAssignTitle("");
                    }}
                    className="rounded-xl px-3 text-xs font-semibold"
                    style={{ background: C.coral, color: "#fff" }}
                  >
                    Assign
                  </button>
                </div>
              </div>
              {tank.length > 0 && (
                <div className="mb-2 rounded-xl p-3" style={{ background: "#FDE2E2", border: `1px solid ${C.coral}` }}>
                  <div className="mb-2 text-xs font-bold" style={{ color: C.coral }}>
                    Holding tank: {tank.length} unassigned {tank.length === 1 ? "task" : "tasks"}
                  </div>
                  {tank.map((a) => (
                    <div key={a.id} className="mb-1.5 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium" style={{ color: C.ink }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 10, color: C.fade }}>{a.date ? `Due ${dayLabel(p.month, a.date)}` : "No deadline"}</div>
                      </div>
                      <select className="rounded-xl border px-2 py-1 text-xs" style={inputStyle} value="" onChange={(e) => void p.reassignTask(a.id, e.target.value)}>
                        <option value="">Reassign to...</option>
                        {t.members.map((id) => (
                          <option key={id} value={id}>
                            {p.nameOf(id)}
                            {id === p.me.id ? " (you)" : ""}
                          </option>
                        ))}
                      </select>
                      <button onClick={() => void p.removeAssigned(a.id)} aria-label="Delete task">
                        <X size={12} style={{ color: C.fade }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <SectionLabel>Track progress</SectionLabel>
              <AssignmentTracker t={t} owner />
            </div>
          )}
          {t.kind === "boss" && !owner && (
            <div className="mt-3">
              <SectionLabel>Your work</SectionLabel>
              <AssignmentTracker t={t} owner={false} />
            </div>
          )}
          <div className="mt-3 rounded-xl p-2" style={{ background: C.cream, maxHeight: 220, overflowY: "auto" }}>
            {tMsgs.length === 0 && (
              <div className="py-3 text-center text-xs" style={{ color: C.fade }}>
                The team room is quiet. Say something.
              </div>
            )}
            {tMsgs.slice(-50).map((m) => (
              <div key={m.id} className="mb-2 flex items-start gap-1.5">
                <Avatar src={p.avatarOf(m.userId)} name={p.nameOf(m.userId)} size={18} />
                <span className="flex-1 text-sm" style={{ color: C.ink }}>
                  <span className="text-xs font-bold" style={{ color: m.userId === p.me.id ? C.gold : C.navy2 }}>
                    {p.nameOf(m.userId)}:{" "}
                  </span>
                  {renderRich(m.text)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
              style={inputStyle}
              placeholder={`Message ${t.name}...`}
              value={teamMsgText}
              onChange={(e) => setTeamMsgText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void p.sendTeamMsg(t.id, teamMsgText);
                  setTeamMsgText("");
                }
              }}
            />
            <button
              onClick={() => {
                void p.sendTeamMsg(t.id, teamMsgText);
                setTeamMsgText("");
              }}
              className="rounded-xl px-3"
              style={{ background: C.gold }}
              aria-label="Send"
            >
              <Send size={16} style={{ color: C.navy }} />
            </button>
          </div>
          <button onClick={() => void p.leaveTeam(t.id)} className="mt-2 text-xs" style={{ color: C.fade, textDecoration: "underline" }}>
            {owner ? "Delete this team" : "Leave this team"}
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-3 text-xs font-bold uppercase" style={{ color: C.coral, letterSpacing: 0.5 }}>
      {children}
    </div>
  );
}

function DaySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const p = usePlanner();
  return (
    <select className="min-w-0 flex-1 rounded-xl border px-2 py-2 text-sm" style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="none">No deadline</option>
      {Array.from({ length: p.month.days }, (_, i) => i + 1).map((d) => (
        <option key={d} value={d}>
          Due {dayLabel(p.month, dstr(p.month, d))}
        </option>
      ))}
    </select>
  );
}

/** A date string back to its day-of-month for the deadline picker, or "none". */
function dayValue(date: string | null): string {
  if (!date) return "none";
  return String(parseInt(date.slice(-2), 10));
}

/**
 * Assigned and Completed tabs for one boss team. The owner picks a member (or
 * everyone) and can edit or delete any row; a member sees only their own work
 * and can just check it off.
 */
function AssignmentTracker({ t, owner }: { t: Team; owner: boolean }) {
  const p = usePlanner();
  const [who, setWho] = useState("");
  const [tab, setTab] = useState<"assigned" | "completed">("assigned");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const mine = p.assignments.filter((a) => a.teamId === t.id && a.toUser && (owner ? !who || a.toUser === who : a.toUser === p.me.id));
  const assigned = mine.filter((a) => !a.done).sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  const completed = mine.filter((a) => a.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  const rows = tab === "assigned" ? assigned : completed;

  return (
    <div>
      {owner && (
        <select className="mb-2 w-full rounded-xl border px-2 py-2 text-sm font-medium" style={{ ...inputStyle, borderColor: C.navy }} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">All members</option>
          {t.members.map((id) => (
            <option key={id} value={id}>
              {p.nameOf(id)}
              {id === p.me.id ? " (you)" : ""}
            </option>
          ))}
        </select>
      )}
      <div className="mb-2 flex rounded-xl p-1" style={{ background: C.mist }}>
        {(
          [
            ["assigned", "Assigned", assigned.length],
            ["completed", "Completed", completed.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold"
            style={{ background: tab === id ? "#fff" : "transparent", color: tab === id ? C.ink : C.fade, boxShadow: tab === id ? "0 1px 2px rgba(17,17,17,0.12)" : "none" }}
          >
            {label}
            <span className="rounded-full px-1.5" style={{ fontSize: 10, background: tab === id ? C.goldSoft : C.line, color: tab === id ? C.goldDeep : C.ink }}>
              {n}
            </span>
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <div className="mb-1.5 rounded-xl px-3 py-3 text-center text-xs" style={{ background: C.cream, color: C.fade }}>
          {tab === "assigned" ? "Nothing waiting." : "Nothing finished yet."}
        </div>
      )}
      {rows.map((a) =>
        editing === a.id ? (
          <AssignmentEditor key={a.id} a={a} t={t} onDone={() => setEditing(null)} />
        ) : (
          <AssignmentRow
            key={a.id}
            a={a}
            owner={owner}
            confirming={confirmDelete === a.id}
            onEdit={() => {
              setConfirmDelete(null);
              setEditing(a.id);
            }}
            onAskDelete={() => setConfirmDelete(confirmDelete === a.id ? null : a.id)}
            onDelete={() => {
              setConfirmDelete(null);
              void p.removeAssigned(a.id);
            }}
          />
        ),
      )}
      {owner && (
        <p className="mt-1 text-xs" style={{ color: C.fade }}>
          Pick a name to see one person&rsquo;s work, or All members for the whole team.
        </p>
      )}
    </div>
  );
}

function AssignmentRow({ a, owner, confirming, onEdit, onAskDelete, onDelete }: { a: Assignment; owner: boolean; confirming: boolean; onEdit: () => void; onAskDelete: () => void; onDelete: () => void }) {
  const p = usePlanner();
  const late = !a.done && !!a.date && a.date < p.today;
  const canToggle = owner || a.toUser === p.me.id;
  const when = a.done ? (a.doneAt ? `Done ${dayLabel(p.month, a.doneAt.slice(0, 10))}` : "Done") : a.date ? (late ? `Overdue, was ${dayLabel(p.month, a.date)}` : `Due ${dayLabel(p.month, a.date)}`) : "No deadline";
  return (
    <div className="mb-1.5 rounded-xl px-3 py-2" style={{ background: C.cream, opacity: a.done ? 0.65 : 1 }}>
      <div className="flex items-center gap-2">
        <button onClick={() => canToggle && void p.toggleAssigned(a)} className="shrink-0" aria-label="Toggle">
          {a.done ? <CheckCircle2 size={18} style={{ color: C.teal }} /> : <Circle size={18} style={{ color: late ? C.coral : C.fade }} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium" style={{ color: C.ink, textDecoration: a.done ? "line-through" : "none" }}>
            {a.title}
          </div>
          <div className="mt-0.5 flex gap-1" style={{ fontSize: 10, color: late ? C.coral : C.fade }}>
            <span>{a.toUser === p.me.id ? "You" : p.nameOf(a.toUser)}</span>
            <span>·</span>
            <span>{when}</span>
          </div>
        </div>
        {owner && (
          <>
            <button onClick={onEdit} className="shrink-0" aria-label="Edit assignment">
              <Pencil size={14} style={{ color: C.fade }} />
            </button>
            <button onClick={onAskDelete} className="shrink-0" aria-label="Delete assignment">
              <Trash2 size={14} style={{ color: confirming ? C.coral : C.fade }} />
            </button>
          </>
        )}
      </div>
      {confirming && (
        <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: C.ink }}>
          <span className="flex-1">Delete this assignment?</span>
          <button onClick={onDelete} className="rounded-lg px-2.5 py-1 font-semibold" style={{ background: C.coral, color: "#fff" }}>
            Delete
          </button>
          <button onClick={onAskDelete} className="rounded-lg px-2.5 py-1 font-semibold" style={{ background: C.mist, color: C.ink }}>
            Keep
          </button>
        </div>
      )}
    </div>
  );
}

function AssignmentEditor({ a, t, onDone }: { a: Assignment; t: Team; onDone: () => void }) {
  const p = usePlanner();
  const [title, setTitle] = useState(a.title);
  const [toUser, setToUser] = useState(a.toUser ?? "");
  const [day, setDay] = useState(dayValue(a.date));
  const save = async () => {
    await p.editAssignment(a.id, { title, toUser, date: day === "none" ? null : dstr(p.month, parseInt(day, 10)) });
    onDone();
  };
  return (
    <div className="mb-1.5 rounded-xl p-3" style={{ background: "#fff", border: `1.5px solid ${C.navy}` }}>
      <input
        className="mb-2 w-full rounded-xl border px-3 py-2 text-sm outline-none"
        style={inputStyle}
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") onDone();
        }}
        autoFocus
      />
      <div className="mb-2 flex gap-2">
        <select className="min-w-0 flex-1 rounded-xl border px-2 py-2 text-sm" style={inputStyle} value={toUser} onChange={(e) => setToUser(e.target.value)}>
          {t.members.map((id) => (
            <option key={id} value={id}>
              {p.nameOf(id)}
              {id === p.me.id ? " (you)" : ""}
            </option>
          ))}
        </select>
        <DaySelect value={day} onChange={setDay} />
      </div>
      <div className="flex gap-2">
        <button onClick={() => void save()} disabled={!title.trim() || !toUser} className="flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: C.coral, color: "#fff", opacity: !title.trim() || !toUser ? 0.5 : 1 }}>
          Save changes
        </button>
        <button onClick={onDone} className="flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: C.mist, color: C.ink }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
