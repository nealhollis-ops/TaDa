"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, CalendarDays, CheckCircle2, Circle, ExternalLink, LogOut, MessageCircle, Mic, RefreshCw, Send, Sun, Trash2, UserCircle, Users, Volume2, VolumeX, X } from "lucide-react";
import { usePlanner } from "./store";
import { Avatar, Bar, C, Chip, Overlay, inputCls, inputStyle } from "./ui";
import { Celebrate } from "./celebrate";
import { ago, dayLabel, dstr, ord, pickableDays, WDFULL } from "@/lib/planner/calendar";
import { BLOCK_META, computeBadges, levelColor, levelIcon, levelOf } from "@/lib/planner/content";
import { loadProfileCard } from "@/lib/data/social";
import type { Block, MemberCard, Repeat } from "@/lib/planner/types";

const TOUR_URL = process.env.NEXT_PUBLIC_TOUR_URL ?? "";

const NAV = [
  { id: "today", label: "Today", Icon: Sun },
  { id: "plan", label: "Plan", Icon: CalendarDays },
  { id: "timeline", label: "Timeline", Icon: BarChart3 },
  { id: "partners", label: "Partners", Icon: Users },
  { id: "community", label: "Community", Icon: MessageCircle },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const p = usePlanner();
  const pathname = usePathname();
  const view = pathname.split("/")[1] || "today";

  if (p.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: C.cream }}>
        <div className="text-center">
          <Image src="/brand/wordmark.png" alt="Tada!" width={143} height={90} priority className="mx-auto" />
          <div className="mt-2 text-sm" style={{ color: C.fade }}>
            Setting up your month...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: C.cream }}>
      <div className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 shadow" style={{ background: C.navy }}>
        <Link href="/today" aria-label="Tada! home" className="flex items-center">
          <Image src="/brand/wordmark-light.png" alt="Tada!" width={51} height={32} priority />
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: C.goldSoft }}>
            {p.month.name} {p.month.year}
          </div>
          <button onClick={() => p.set("inboxOpen", true)} aria-label={p.unreadCount ? `${p.unreadCount} unread notifications` : "Notifications"} className="relative">
            <Bell size={20} style={{ color: C.cream }} />
            {p.unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold" style={{ background: C.coral, color: "#fff", lineHeight: 1 }}>
                {p.unreadCount > 9 ? "9+" : p.unreadCount}
              </span>
            )}
          </button>
          <button onClick={p.toggleMute} aria-label="Sound">
            {p.me.muted ? <VolumeX size={20} style={{ color: C.goldSoft, opacity: 0.6 }} /> : <Volume2 size={20} style={{ color: C.cream }} />}
          </button>
          <Link href="/account" aria-label="Account">
            <UserCircle size={24} style={{ color: view === "account" ? C.gold : C.cream }} />
          </Link>
          <form action="/auth/signout" method="post" className="flex">
            <button type="submit" aria-label="Log out" title="Log out">
              <LogOut size={20} style={{ color: C.cream }} />
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-md pb-24">
        {["today", "plan", "timeline"].includes(view) && <CommandBar />}
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-around border-t py-2" style={{ background: "#fff", borderColor: C.line, zIndex: 50, paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
        {NAV.map(({ id, label, Icon }) => (
          <Link key={id} href={`/${id}`} className="flex flex-col items-center gap-0.5 px-2 py-1">
            <span className="flex items-center justify-center rounded-full" style={{ width: 44, height: 26, background: view === id ? C.coral : "transparent", color: view === id ? "#fff" : C.navy }}>
              <Icon size={20} />
            </span>
            <span style={{ fontSize: 11, color: C.navy, fontWeight: view === id ? 700 : 500 }}>
              {label}
            </span>
          </Link>
        ))}
      </div>

      <OnboardingWidget />
      {p.inboxOpen && <InboxPanel />}
      {p.showTour && <TourModal />}
      {p.viewProfile && <ProfileModal id={p.viewProfile} />}
      {p.confirmRemove && <ConfirmRemoveModal />}
      <Celebrate burst={p.burst} />
      {p.bigMsg && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 70 }}>
          <div className="rounded-2xl px-8 py-4 text-center" style={{ background: "rgba(20,42,56,0.92)" }}>
            <div style={{ color: "#fff", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 64, lineHeight: 1.1 }}>TaDa!</div>
            <div style={{ color: C.cream, fontSize: 16 }}>Well done. That was a big one.</div>
          </div>
        </div>
      )}
      {p.ceremony && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 75, background: "rgba(20,42,56,0.35)" }}>
          <div className="mx-6 rounded-3xl px-8 py-8 text-center" style={{ background: "rgba(17,17,17,0.96)", border: `3px solid ${C.gold}` }}>
            <div className="animate-bounce" style={{ fontSize: 72, lineHeight: 1 }}>
              {p.ceremony.badge.e}
            </div>
            <div className="mt-3" style={{ color: C.gold, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 30 }}>
              {p.ceremony.badge.name}
            </div>
            <div className="mt-2 text-sm font-bold" style={{ color: C.cream }}>
              {p.ceremony.line1}
            </div>
            <div className="mt-1 text-xs" style={{ color: C.goldSoft }}>
              {p.ceremony.line2}
            </div>
          </div>
        </div>
      )}
      {p.editing && <EditSheet />}
      {p.toast && (
        <div className="pointer-events-none fixed left-0 right-0 flex justify-center" style={{ bottom: 84, zIndex: 95 }}>
          <div className="rounded-full px-4 py-2 text-sm font-medium shadow-lg" style={{ background: C.ink, color: C.cream }}>
            {p.toast.text}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandBar() {
  const p = usePlanner();
  return (
    <div className="px-5 pt-4">
      <div className="flex gap-2">
        <button onClick={p.startListening} className="rounded-xl px-3" style={{ background: p.listening ? C.coral : C.navy }} aria-label="Talk to the calendar">
          <Mic size={18} style={{ color: "#fff" }} className={p.listening ? "animate-pulse" : ""} />
        </button>
        <input
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: p.listening ? C.coral : C.line, background: "#fff", color: C.ink }}
          placeholder={p.listening ? "Listening..." : "Tap the mic and say the change..."}
          value={p.cmdText}
          onChange={(e) => p.set("cmdText", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void p.runCommand();
          }}
        />
        <button onClick={() => void p.runCommand()} disabled={p.cmdBusy} className="rounded-xl px-4" style={{ background: C.mist, opacity: p.cmdBusy ? 0.7 : 1 }} aria-label="Send">
          {p.cmdBusy ? <RefreshCw size={18} className="animate-spin" style={{ color: C.navy }} /> : <Send size={18} style={{ color: C.navy }} />}
        </button>
      </div>
      {p.cmdSay && (
        <div className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: C.goldSoft, color: C.ink }}>
          <span className="flex-1">{p.cmdSay}</span>
          <button onClick={() => p.set("cmdSay", "")} aria-label="Dismiss">
            <X size={14} style={{ color: C.fade }} />
          </button>
        </div>
      )}
    </div>
  );
}

function OnboardingWidget() {
  const p = usePlanner();
  if (p.me.onboarding.done) return null;
  const go = (id: string) => {
    p.set("onbOpen", false);
    if (id === "tour") {
      p.set("showTour", true);
      return;
    }
    const target = id === "task" ? "/plan" : id === "check" ? "/today" : id === "hello" ? "/community" : "/partners";
    if (id === "task") p.set("showAdd", true);
    window.location.assign(target);
  };
  return (
    <div className="fixed right-4" style={{ bottom: 72, zIndex: 55 }}>
      {p.onbOpen ? (
        <div className="rounded-2xl p-4 shadow-xl" style={{ background: "#fff", width: 260, border: `2px solid ${C.gold}` }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: C.navy }}>
              Getting started
            </span>
            <button onClick={() => p.set("onbOpen", false)} aria-label="Close">
              <X size={16} style={{ color: C.fade }} />
            </button>
          </div>
          {p.onbItems.map((i) => (
            <button key={i.id} onClick={() => go(i.id)} className="flex w-full items-center gap-2 py-1.5 text-left">
              {i.done ? <CheckCircle2 size={18} style={{ color: C.teal }} /> : <Circle size={18} style={{ color: C.fade }} />}
              <span className="text-xs" style={{ color: i.done ? C.fade : C.ink, textDecoration: i.done ? "line-through" : "none" }}>
                {i.label}
              </span>
            </button>
          ))}
          <div className="mt-2">
            <Bar pct={(p.onbDoneCount / p.onbItems.length) * 100} h={6} />
          </div>
        </div>
      ) : (
        <button onClick={() => p.set("onbOpen", true)} className="rounded-full px-4 py-2.5 text-xs font-bold shadow-xl" style={{ background: C.coral, color: "#fff" }}>
          Getting started · {p.onbDoneCount} of {p.onbItems.length}
        </button>
      )}
    </div>
  );
}

function TourModal() {
  const p = usePlanner();
  return (
    <Overlay onClose={() => p.set("showTour", false)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold" style={{ color: C.navy }}>
          Welcome tour
        </span>
        <button onClick={() => p.set("showTour", false)} aria-label="Close">
          <X size={18} style={{ color: C.fade }} />
        </button>
      </div>
      {TOUR_URL ? (
        <iframe src={TOUR_URL} title="Welcome tour" className="w-full rounded-xl" style={{ height: 200, border: "none" }} allow="autoplay; fullscreen" />
      ) : (
        <div className="rounded-xl p-5 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
          The tour video is on its way. Poke around in the meantime: Plan is where your month lives, Today is where you win it.
        </div>
      )}
      <button onClick={p.markTour} className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: C.teal, color: C.ink }}>
        Mark the tour watched
      </button>
    </Overlay>
  );
}

function ProfileModal({ id }: { id: string }) {
  const p = usePlanner();
  const [card, setCard] = useState<(MemberCard & { bio: string | null; link: string | null; canView: boolean }) | null | undefined>(undefined);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => {
    let alive = true;
    loadProfileCard(p.sb, id)
      .then((c) => alive && setCard(c))
      .catch(() => alive && setCard(null));
    return () => {
      alive = false;
    };
  }, [p.sb, id]);
  const close = () => p.set("viewProfile", null);
  const isMe = id === p.me.id;
  const blocked = p.isBlocked(id);
  const badges = card?.stats ? computeBadges(card.stats, card.hasPartner) : [];
  const level = card?.stats ? levelOf(card.stats.totalDone) : 0;
  const canAsk = card?.seeking && !isMe && !p.myPartnerIds.includes(id) && !p.outgoing.some((r) => r.toUser === id);

  return (
    <Overlay onClose={close}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold" style={{ color: C.navy }}>
          Profile
        </span>
        <button onClick={close} aria-label="Close">
          <X size={18} style={{ color: C.fade }} />
        </button>
      </div>
      {card === undefined ? (
        <p className="text-sm" style={{ color: C.fade }}>
          Loading...
        </p>
      ) : !card ? (
        <p className="text-sm" style={{ color: C.fade }}>
          Nothing to show yet. They&rsquo;ll appear here once they&rsquo;ve been active.
        </p>
      ) : !card.canView ? (
        <div className="py-4 text-center">
          <div className="mb-2 flex justify-center">
            <Avatar src={card.avatarUrl} name={card.name} size={56} />
          </div>
          <div className="text-base font-bold" style={{ color: C.navy }}>
            {card.name}
          </div>
          <p className="mt-2 text-xs" style={{ color: C.fade }}>
            This profile is private.
          </p>
          <ProfileLink href={card.link} center />
          {!isMe && !blocked && (
            <button onClick={() => void p.blockUser(id)} className="mt-3 rounded-xl px-4 py-2 text-xs font-semibold" style={{ background: "#FDE2E2", color: C.coral }}>
              Block this member
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Avatar src={card.avatarUrl} name={card.name} size={56} />
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold" style={{ color: C.navy }}>
                {card.name}
                {isMe ? " (you)" : ""}
              </div>
              {card.bio && (
                <div className="text-xs" style={{ color: C.fade, fontStyle: "italic" }}>
                  {card.bio}
                </div>
              )}
            </div>
          </div>
          <ProfileLink href={card.link} />
          {card.stats ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip color="#E30022" bg="#FDE2E2">🔥 {card.stats.streak} day streak</Chip>
              <Chip color={C.navy2} bg="#FDE2E2">Best {card.stats.bestStreak}</Chip>
              <Chip color={levelColor(level)} bg="#FDE2E2">
                {levelIcon(level)} Level {level}
              </Chip>
            </div>
          ) : (
            <p className="mb-3 text-xs" style={{ color: C.fade }}>
              Progress numbers are kept private.
            </p>
          )}
          {card.progress && card.progress.total > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs" style={{ color: C.fade }}>
                <span>This month</span>
                <span>
                  {card.progress.done} of {card.progress.total}
                </span>
              </div>
              <Bar pct={(card.progress.done / card.progress.total) * 100} color={C.teal} />
            </div>
          )}
          {card.stats && (
            <>
              <div className="mb-2 text-xs font-semibold" style={{ color: C.navy2 }}>
                Badges earned
              </div>
              {badges.length === 0 ? (
                <p className="text-xs" style={{ color: C.fade }}>
                  No badges yet. The story is just starting.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {badges.map((b) => (
                    <div key={b.id} className="rounded-xl p-2 text-center" style={{ background: C.goldSoft }}>
                      <div style={{ fontSize: 20 }}>{b.e}</div>
                      <div className="font-semibold" style={{ fontSize: 9, color: C.navy }}>
                        {b.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {canAsk && (
            <button
              onClick={() => {
                void p.sendRequest(id);
                close();
              }}
              className="mt-3 w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: C.navy, color: C.cream }}
            >
              Ask to partner
            </button>
          )}
          {!isMe && (
            <div className="mt-2 flex gap-2">
              {blocked ? (
                <button onClick={() => void p.unblockUser(id)} className="flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "#FDE2E2", color: C.ink }}>
                  Unblock {card.name}
                </button>
              ) : (
                <button onClick={() => void p.blockUser(id)} className="flex-1 rounded-xl py-2 text-xs font-semibold" style={{ background: "#FDE2E2", color: C.coral }}>
                  Block this member
                </button>
              )}
              <button onClick={() => setReporting((r) => !r)} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "#FDE2E2", color: C.ink }}>
                Report
              </button>
            </div>
          )}
          {reporting && (
            <div className="mt-2">
              <textarea className={`${inputCls} resize-none`} style={inputStyle} rows={2} maxLength={500} placeholder="What's going on? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button
                onClick={() => {
                  void p.reportUser(id, reason);
                  setReporting(false);
                  setReason("");
                }}
                className="mt-2 w-full rounded-xl py-2 text-xs font-semibold"
                style={{ background: C.navy, color: C.cream }}
              >
                Send report
              </button>
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
}

function ConfirmRemoveModal() {
  const p = usePlanner();
  const cr = p.confirmRemove!;
  const stillOnAnother = p.teams.some((t) => t.kind === "boss" && t.ownerId === p.me.id && t.id !== cr.teamId && t.members.includes(cr.userId));
  return (
    <Overlay z={90}>
      <div className="mb-2 font-bold" style={{ color: C.navy }}>
        Remove {cr.name}?
      </div>
      <p className="mb-2 text-sm" style={{ color: C.ink }}>
        This cancels their seat on {cr.teamName}. Their unfinished assigned tasks move to the holding tank so you can hand them to someone else. This can&rsquo;t be undone.
      </p>
      <p className="mb-4 text-xs" style={{ color: C.fade }}>
        {stillOnAnother
          ? "They're still on another of your teams, so their seat stays in use."
          : p.seatExtra > 0
            ? "This ends one $9 extra seat on your next bill."
            : `This frees one of your 7 included seats. You'll be using ${Math.max(0, p.seatCount - 1)} of 7.`}
      </p>
      <div className="flex gap-2">
        <button onClick={() => p.set("confirmRemove", null)} className="flex-1 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "#FDE2E2", color: C.ink }}>
          Keep them
        </button>
        <button
          onClick={() => {
            void p.removeMember(cr.teamId, cr.userId);
            p.set("confirmRemove", null);
          }}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: C.coral, color: "#fff" }}
        >
          Yes, remove them
        </button>
      </div>
    </Overlay>
  );
}

function EditSheet() {
  const p = usePlanner();
  const e = p.editing!;
  const m = p.month;
  const upd = (patch: Partial<typeof e>) => p.set("editing", { ...e, ...patch });
  const sel = "w-full rounded-xl border px-2 py-2.5 text-sm";
  return (
    <Overlay z={80} align="end">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold" style={{ color: C.navy }}>
          Edit task
        </span>
        <button onClick={() => p.set("editing", null)} aria-label="Close">
          <X size={18} style={{ color: C.fade }} />
        </button>
      </div>
      <input className={`${inputCls} mb-3`} style={inputStyle} value={e.title} onChange={(ev) => upd({ title: ev.target.value })} />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <select className={sel} style={inputStyle} value={e.date ? parseInt(e.date.slice(8), 10) : "auto"} onChange={(ev) => upd(ev.target.value === "auto" ? { date: null } : { date: dstr(m, parseInt(ev.target.value, 10)) })}>
          <option value="auto">No day yet</option>
          {pickableDays(m, p.today, e.date).map((d) => (
            <option key={d} value={d}>
              {dayLabel(m, dstr(m, d))}
            </option>
          ))}
        </select>
        <select className={sel} style={inputStyle} value={e.block === "auto" ? "afternoon" : e.block} onChange={(ev) => upd({ block: ev.target.value as Block })}>
          {BLOCK_META.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>
      {!e.date && (
        <select className={`${sel} mb-3`} style={inputStyle} value={e.week} onChange={(ev) => upd({ week: parseInt(ev.target.value, 10) })}>
          {m.weeks.map((w) => (
            <option key={w.w} value={w.w}>
              {w.label}
            </option>
          ))}
        </select>
      )}
      <select className={`${sel} mb-3`} style={inputStyle} value={e.repeat || "none"} onChange={(ev) => upd({ repeat: ev.target.value as Repeat, anchor: null })}>
        <option value="none">One time</option>
        <option value="daily">Daily</option>
        <option value="weekdays">Daily (Mon - Fri)</option>
        <option value="weekly">Every week</option>
        <option value="monthly">Every month</option>
      </select>
      {e.repeat === "weekly" && (
        <select className={`${sel} mb-3`} style={inputStyle} value={e.anchor ?? ""} onChange={(ev) => upd({ anchor: ev.target.value === "" ? null : parseInt(ev.target.value, 10) })}>
          <option value="">Any day, let the app place it</option>
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
            <option key={wd} value={wd}>
              Every {WDFULL[wd]}
            </option>
          ))}
        </select>
      )}
      {e.repeat === "monthly" && (
        <select className={`${sel} mb-3`} style={inputStyle} value={e.anchor ?? ""} onChange={(ev) => upd({ anchor: ev.target.value === "" ? null : parseInt(ev.target.value, 10) })}>
          <option value="">Any day, let the app place it</option>
          {Array.from({ length: m.days }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              The {ord(d)} of every month
            </option>
          ))}
        </select>
      )}
      <label className="mb-4 flex items-center gap-2 text-sm" style={{ color: C.ink }}>
        <input type="checkbox" checked={!!e.big} onChange={(ev) => upd({ big: ev.target.checked })} />
        Big win
      </label>
      <div className="flex gap-2">
        <button onClick={() => p.removeTask(e.id)} className="rounded-xl px-4 py-2.5" style={{ background: C.mist }} aria-label="Delete task">
          <Trash2 size={16} style={{ color: C.coral }} />
        </button>
        <button onClick={() => p.saveEdit(e)} className="flex-1 rounded-xl py-2.5 font-semibold" style={{ background: C.navy, color: C.cream }}>
          Save
        </button>
      </div>
    </Overlay>
  );
}

function InboxPanel() {
  const p = usePlanner();
  const router = useRouter();
  const close = () => p.set("inboxOpen", false);
  const open = (id: string, url: string) => {
    void p.markRead(id);
    close();
    router.push(url);
  };
  return (
    <Overlay onClose={close} align="end">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-base font-bold" style={{ color: C.navy }}>
          Notifications
        </div>
        <div className="flex items-center gap-3">
          {p.unreadCount > 0 && (
            <button onClick={() => void p.markAllRead()} className="text-xs font-semibold underline" style={{ color: C.fade }}>
              Mark all read
            </button>
          )}
          <button onClick={close} aria-label="Close">
            <X size={18} style={{ color: C.fade }} />
          </button>
        </div>
      </div>
      {p.inbox.length === 0 ? (
        <div className="rounded-xl p-5 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
          Nothing yet. Messages, partner requests, badges and announcements land here.
        </div>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {p.inbox.map((n) => (
            <button key={n.id} onClick={() => open(n.id, n.url)} className="flex w-full items-start gap-3 rounded-xl p-3 text-left" style={{ background: "#fff", opacity: n.readAt ? 0.7 : 1 }}>
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: n.readAt ? "transparent" : C.coral }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm" style={{ color: C.ink, fontWeight: n.readAt ? 500 : 700 }}>
                  {n.title}
                </span>
                {n.body && (
                  <span className="mt-0.5 block text-xs" style={{ color: C.fade }}>
                    {n.body}
                  </span>
                )}
                <span className="mt-1 block text-[10px]" style={{ color: C.fade }}>
                  {ago(n.createdAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Overlay>
  );
}

/** An admin's outbound link on their profile card, shown as a button with the bare domain. */
function ProfileLink({ href, center = false }: { href: string | null; center?: boolean }) {
  if (!href) return null;
  let label = href;
  try {
    label = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw value
  }
  return (
    <div className={`mb-3 flex ${center ? "justify-center" : ""}`}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.navy, color: C.cream }}>
        <ExternalLink size={13} />
        {label}
      </a>
    </div>
  );
}
