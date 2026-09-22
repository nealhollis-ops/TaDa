"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Play } from "lucide-react";
import { InstallCard } from "@/components/pwa/install-card";
import { NotificationsCard } from "@/components/pwa/notifications-card";
import { usePlanner } from "../store";
import { Avatar, C, Chip, inputCls, inputStyle } from "../ui";
import { AvatarCropper } from "../avatar-cropper";
import { BADGE_CATALOG, HELP, levelColor, levelIcon, levelOf, nextLevelAt } from "@/lib/planner/content";
import { loadSeatRoster } from "@/lib/data/social";
import type { SeatRow } from "@/lib/planner/types";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "soon");

const PLAN_COPY = {
  standard: "The full planner: voice control, celebrations, community, and one accountability partner. $17 a month, or $170 a year with two months free.",
  teams: "Everything in Standard plus unlimited partners and named team groups with their own discussion and progress view. $27 a month, or $270 a year with two months free.",
  boss: "Everything in Teams plus boss powers: assign tasks with deadlines, see every assignment and its status, manage the work, and message the team. $97 a month, or $970 a year, with 7 member seats included and $9 a month per extra seat.",
};

/** Accept "mysite.com" as well as a full URL; anything that is not http(s) is dropped. */
function normalizeLink(raw: string): string {
  const v = raw.trim().slice(0, 200);
  if (!v) return "";
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export function AccountScreen() {
  const p = usePlanner();
  const [name, setName] = useState(p.me.name);
  const [bio, setBio] = useState(p.me.bio);
  const [link, setLink] = useState(p.me.link);
  const [hidden, setHidden] = useState(p.me.hidden);
  const [priv, setPriv] = useState(p.me.private);
  const [seeking, setSeeking] = useState(p.me.seeking);
  const [helpOpen, setHelpOpen] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [roster, setRoster] = useState<SeatRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (p.plan === "boss" && p.bossSeatIds.length) loadSeatRoster(p.sb).then(setRoster).catch(() => {});
  }, [p.sb, p.plan, p.bossSeatIds.length]);

  const save = async () => {
    setSaving(true);
    const admin = p.me.role === "admin";
    await p.saveAccount({ name: name.trim() || p.me.name, bio: bio.slice(0, 150), hidden, private: priv, seeking, ...(admin ? { link: normalizeLink(link) } : {}) });
    if (admin) setLink(normalizeLink(link));
    setSaving(false);
  };

  const hasPartner = p.myPartnerIds.length > 0;
  const level = levelOf(p.stats.totalDone);

  return (
    <div className="px-5 py-5">
      <h2 className="mb-3 text-lg font-bold" style={{ color: C.navy }}>
        Account
      </h2>

      <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="mb-2 text-xs font-semibold" style={{ color: C.navy2 }}>
          Your profile
        </div>
        <div className="mb-3 flex items-center gap-3">
          <Avatar src={p.me.avatarUrl} name={name || p.me.name} size={56} />
          <div className="flex-1">
            <label className="inline-block cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.navy, color: C.cream }}>
              {p.me.avatarUrl ? "Change photo" : "Add a photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCropFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {p.me.avatarUrl && (
              <button onClick={() => void p.removeAvatar()} className="ml-2 text-xs" style={{ color: C.fade, textDecoration: "underline" }}>
                Remove
              </button>
            )}
            <p className="mt-1 text-xs" style={{ color: C.fade }}>
              Shows next to your messages and posts.
            </p>
            {cropFile && (
              <AvatarCropper
                file={cropFile}
                onCancel={() => setCropFile(null)}
                onError={(m) => {
                  p.showToast(m);
                  setCropFile(null);
                }}
                onDone={(blob) => {
                  setCropFile(null);
                  void p.pickAvatar(blob);
                }}
              />
            )}
          </div>
        </div>
        <input className={`${inputCls} mb-2`} style={inputStyle} placeholder="Your name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inputCls} mb-2`} style={{ ...inputStyle, color: C.fade }} value={p.me.email} readOnly />
        <textarea className={`${inputCls} mt-1 resize-none`} rows={2} maxLength={150} style={inputStyle} placeholder="A mini bio, up to 150 characters. It shows where people pick partners." value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} />
        <div className="text-right text-xs" style={{ color: C.fade }}>
          {bio.length}/150
        </div>
        {p.me.role === "admin" && (
          <div className="mt-1">
            <input className={inputCls} style={inputStyle} type="url" inputMode="url" placeholder="https://your-site.com" maxLength={200} value={link} onChange={(e) => setLink(e.target.value)} />
            <p className="mt-1 text-xs" style={{ color: C.fade }}>
              Admins only: a link to your bio, website or product. It shows as a button on your profile when members open it.
            </p>
          </div>
        )}
        <label className="mt-3 flex items-start gap-2 text-sm" style={{ color: C.ink }}>
          <input type="checkbox" className="mt-0.5" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
          <span>Keep me hidden. Your progress card stays out of everyone&rsquo;s open circle and partner lists. Your partners and boss teammates still see your progress.</span>
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm" style={{ color: C.ink }}>
          <input type="checkbox" className="mt-0.5" checked={priv} onChange={(e) => setPriv(e.target.checked)} />
          <span>Private profile. Nobody can open your profile card, so your badges, streaks, and bio stay yours alone. Your name and posts still show.</span>
        </label>
      </div>

      <NotificationsCard on={p.me.notifOn} onToggle={() => void p.toggleNotif()} communityOn={p.me.notifCommunity} onToggleCommunity={() => void p.toggleCommunityNotif()} />

      <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="mb-2 text-xs font-semibold" style={{ color: C.navy2 }}>
          Accountability partners
        </div>
        <label className="flex items-start gap-2 text-sm" style={{ color: C.ink }}>
          <input type="checkbox" className="mt-0.5" checked={seeking} onChange={(e) => setSeeking(e.target.checked)} />
          <span>I&rsquo;m looking for an accountability partner. Your name gets listed on the Partners tab so others can choose you.</span>
        </label>
        <p className="mt-2 text-xs" style={{ color: C.fade }}>
          Partnerships start with a request and an accept. Partners see your weekly and monthly progress only, never your actual tasks. The hidden setting above overrides this and keeps you off every list.
        </p>
      </div>

      {p.blocked.length > 0 && (
        <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
          <div className="mb-2 text-xs font-semibold" style={{ color: C.navy2 }}>
            Blocked members
          </div>
          {p.blocked.map((id) => (
            <div key={id} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
              <span className="text-sm" style={{ color: C.ink }}>
                {p.nameOf(id)}
              </span>
              <button onClick={() => void p.unblockUser(id)} className="text-xs font-semibold" style={{ color: C.teal }}>
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: C.navy2 }}>
            Your badge case
          </span>
          {p.stats.streak >= 2 && (
            <span className="text-xs font-bold" style={{ color: C.coral }}>
              🔥 {p.stats.streak} day streak
            </span>
          )}
        </div>
        <div className="mb-1 text-xs font-bold" style={{ color: levelColor(level) }}>
          {levelIcon(level)} Mountain Level {level} · {p.stats.totalDone} tasks done, next level at {nextLevelAt(p.stats.totalDone)}
        </div>
        <p className="mb-3 text-xs" style={{ color: C.fade }}>
          Your top two badges and your streak show next to your name everywhere. Sundays always count toward your streak. Saturdays count too, unless you scheduled that Saturday and left it undone.
        </p>
        <div className="grid grid-cols-4 gap-2">
          {BADGE_CATALOG.map((b) => {
            const cur = b.val(p.stats, hasPartner);
            const earned = cur >= b.target;
            return (
              <div key={b.id} className="rounded-xl p-2 text-center" style={{ background: earned ? C.goldSoft : C.mist, opacity: earned ? 1 : 0.45 }}>
                <div style={{ fontSize: 20 }}>{b.e}</div>
                <div className="font-semibold" style={{ fontSize: 9, color: C.navy }}>
                  {b.name}
                </div>
                {!earned && (
                  <div style={{ fontSize: 8, color: C.fade }}>
                    {Math.min(cur, b.target)}/{b.target}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-4 rounded-2xl p-4" style={{ background: C.navy }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: C.cream }}>
            Your plan
          </span>
          <Chip color={C.navy} bg={C.gold}>
            {p.plan === "boss" ? "Boss" : p.plan === "teams" ? "Teams" : "Standard"}
          </Chip>
        </div>
        <p className="text-xs" style={{ color: C.goldSoft }}>
          {PLAN_COPY[p.plan]}
        </p>
        {p.billing?.source === "stripe" ? (
          <>
            <p className="mt-2 text-xs" style={{ color: C.goldSoft }}>
              {p.billing.status === "trialing"
                ? `Free trial. Your first payment is on ${fmtDate(p.billing.expiresAt)}.`
                : p.billing.status === "past_due"
                  ? "Your last payment didn't go through. Update your card to keep your access."
                  : p.billing.status === "canceled"
                    ? `Canceled. Access ends ${fmtDate(p.billing.expiresAt)}.`
                    : `Active. Renews ${fmtDate(p.billing.expiresAt)}.`}
              {p.plan === "boss" && ` ${p.billing.seatsIncluded} boss seats on your plan.`}
            </p>
            {p.plan !== "boss" && p.billing.status !== "canceled" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {p.plan === "standard" && (
                  <button onClick={() => void p.openPortal("teams")} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.coral, color: "#fff" }}>
                    Upgrade to Teams, $27/mo
                  </button>
                )}
                <button onClick={() => void p.openPortal("boss")} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.coral, color: "#fff" }}>
                  Upgrade to Boss, $97/mo
                </button>
              </div>
            )}
            <p className="mt-2 text-xs" style={{ color: C.goldSoft }}>
              {p.plan !== "boss" && p.billing.status !== "canceled" ? "Upgrades take effect right away and only charge the difference for the rest of this period. Yearly plans upgrade to the yearly price." : ""}
            </p>
            <button onClick={() => void p.openPortal()} className="mt-1 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>
              Manage billing: card, invoices, change or cancel plan
            </button>
          </>
        ) : (
          <p className="mt-2 text-xs" style={{ color: C.goldSoft }}>
            {p.billing?.source === "comp"
              ? `Complimentary access${p.billing.expiresAt ? ` through ${fmtDate(p.billing.expiresAt)}` : ""}. Nothing to pay.`
              : p.billing?.source === "admin"
                ? "Founder access. Nothing to pay, ever."
                : "Every new member starts with 14 days free, then rolls into the plan they chose. Upgrades prorate automatically."}
          </p>
        )}
        {p.me.role === "admin" && (
          <Link href="/admin" className="mt-3 inline-block rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: C.goldSoft, color: C.goldDeep }}>
            Open the admin panel
          </Link>
        )}
      </div>

      {p.plan === "boss" && roster.length > 0 && (
        <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
          <div className="mb-2 text-xs font-semibold" style={{ color: C.navy2 }}>
            Your seats
          </div>
          {roster.map((r) => (
            <div key={r.userId} className="flex items-center gap-2 py-2" style={{ borderBottom: `1px solid ${C.line}` }}>
              <Avatar src={r.avatarUrl} name={r.name} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold" style={{ color: C.navy }}>
                  {r.name}
                </div>
                <div className="truncate text-xs" style={{ color: C.fade }}>
                  {r.email} · {r.teamNames.join(", ")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <InstallCard />

      <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
        <div className="mb-1 text-xs font-semibold" style={{ color: C.navy2 }}>
          Help
        </div>
        <p className="mb-2 text-xs" style={{ color: C.fade }}>
          Tap any topic for exact instructions, or read the whole guide on one page at{" "}
          <Link href="/help" className="underline">
            How TaDa works
          </Link>
          .
        </p>
        {HELP.map((h) => (
          <div key={h.id} style={{ borderBottom: `1px solid ${C.line}` }}>
            <button onClick={() => setHelpOpen(helpOpen === h.id ? null : h.id)} className="flex w-full items-center justify-between py-2.5 text-left">
              <span className="text-sm font-semibold" style={{ color: C.navy }}>
                {h.t}
              </span>
              <span style={{ color: C.gold, fontSize: 16 }}>{helpOpen === h.id ? "−" : "+"}</span>
            </button>
            {helpOpen === h.id && (
              <div className="pb-3">
                {h.b.map((para, i) => (
                  <p key={i} className="text-xs leading-relaxed" style={{ color: para.startsWith("Q: ") ? C.navy : C.ink, fontWeight: para.startsWith("Q: ") ? 700 : 400, marginBottom: para.startsWith("Q: ") ? 2 : 8 }}>
                    {para}
                  </p>
                ))}
                {h.id === "start" && (
                  <button onClick={() => p.set("showTour", true)} className="flex items-center gap-1.5 text-xs font-semibold underline" style={{ color: C.navy }}>
                    <Play size={12} /> Watch the welcome tour
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <a href="mailto:clientcare@gettada.me" className="mt-3 block w-full rounded-xl py-2.5 text-center text-sm font-semibold" style={{ background: C.teal, color: C.ink, textDecoration: "none" }}>
          Email us: clientcare@gettada.me
        </a>
        <p className="mt-2 text-center text-xs" style={{ color: C.fade }}>
          Stuck on anything at all? Write in. A real person answers.
        </p>
      </div>

      <button onClick={() => void save()} disabled={saving} className="w-full rounded-xl py-3 font-semibold" style={{ background: C.coral, color: "#fff", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving..." : "Save my account"}
      </button>
      <form action="/auth/signout" method="post" className="mt-3">
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold" style={{ background: "#fff", color: C.coral, border: `1px solid ${C.coral}` }}>
          <LogOut size={16} /> Log out
        </button>
      </form>
      <div className="mt-3 text-center text-xs" style={{ color: C.fade }}>
        <Link href="/account/password" className="underline">
          Set or change password
        </Link>
      </div>
      <p className="mt-3 text-center text-xs" style={{ color: C.fade }}>
        <Link href="/legal/terms" className="underline">Terms</Link> · <Link href="/legal/privacy" className="underline">Privacy</Link> · <Link href="/legal/refunds" className="underline">Refunds</Link>
      </p>
    </div>
  );
}
