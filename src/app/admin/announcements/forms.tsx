"use client";

import { useActionState } from "react";
import { deleteContent, endBanner, postAnnouncement, pushAnnouncement, saveBanner, setPinned, type AdminResult } from "../actions";
import { Notice } from "../notice";

type Pinned = { id: string; type: string; text: string; createdAt: string; by: string };
type BannerRow = { id: string; text: string; startsAt: string; endsAt: string };

/** "24 Sep, 14:30" - short, local, and unambiguous about the day. */
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What a datetime-local input wants, in the admin's own timezone. */
const localValue = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function AnnouncementForms({ pinned, banners }: { pinned: Pinned[]; banners: BannerRow[] }) {
  const [bannerState, bannerAction, savingBanner] = useActionState<AdminResult, FormData>(saveBanner, null);
  const [endState, endAction, ending] = useActionState<AdminResult, FormData>(endBanner, null);
  const now = new Date();
  const [postState, postAction, posting] = useActionState<AdminResult, FormData>(postAnnouncement, null);
  const [pinState, pinAction, pinning] = useActionState<AdminResult, FormData>(setPinned, null);
  const [delState, delAction, deleting] = useActionState<AdminResult, FormData>(deleteContent, null);
  const [pushState, pushAction, pushing] = useActionState<AdminResult, FormData>(pushAnnouncement, null);
  const input = "rounded-xl border border-line bg-white px-3 py-2 text-sm";
  return (
    <div>
      <form action={bannerAction} className="mt-4 rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Banner on Today and Plan</h2>
        <p className="mt-1 text-xs text-fade">Everyone sees this across the top of both screens while it is in date. It takes itself down when the window closes, so nothing is left up by mistake.</p>
        <label className="mt-3 block text-xs text-fade">
          Notice
          <textarea name="text" rows={3} required maxLength={400} className={`${input} mt-1 block w-full`} placeholder="The app will be down for about an hour on Saturday morning..." />
        </label>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-fade">
            From
            <input type="datetime-local" name="starts" defaultValue={localValue(now)} className={`${input} block`} />
          </label>
          <label className="text-xs text-fade">
            Until
            <input type="datetime-local" name="ends" required defaultValue={localValue(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000))} className={`${input} block`} />
          </label>
          <button type="submit" disabled={savingBanner} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {savingBanner ? "Saving..." : "Put it up"}
          </button>
        </div>
        <Notice state={bannerState} />
      </form>

      {/* Outside the form above on purpose: a form cannot contain another one,
          and nesting these made Take down submit the save form instead. */}
      {banners.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fade">Banners ({banners.length})</h3>
          <ul className="mt-2 space-y-2">
            {banners.map((b) => {
              const live = new Date(b.startsAt) <= now && new Date(b.endsAt) > now;
              const over = new Date(b.endsAt) <= now;
              return (
                <li key={b.id} className="flex flex-wrap items-start gap-2 rounded-xl border border-line p-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="text-ink">{b.text}</span>
                    <span className="mt-0.5 block text-xs text-fade">
                      {live ? "Up now" : over ? "Finished" : "Scheduled"} &middot; {when(b.startsAt)} to {when(b.endsAt)}
                    </span>
                  </span>
                  <form action={endAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <button type="submit" disabled={ending} className="rounded-xl bg-mist px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60">
                      {over ? "Remove" : "Take down"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
          <Notice state={endState} />
        </div>
      )}

      <form action={postAction} className="mt-6 rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Post and pin in the community</h2>
        <label className="block text-xs text-fade">
          Announcement
          <textarea name="text" rows={4} required maxLength={2000} className={`${input} mt-1 block w-full`} placeholder="Something the whole community should see..." />
        </label>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-fade">
            Room
            <select name="type" defaultValue="boost" className={`${input} block`}>
              <option value="boost">Encourage</option>
              <option value="hi">Say Hi</option>
              <option value="question">Questions</option>
              <option value="win">Wins</option>
            </select>
          </label>
          <button type="submit" disabled={posting} className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {posting ? "Posting..." : "Post and pin"}
          </button>
        </div>
        <Notice state={postState} />
      </form>

      <form action={pushAction} className="mt-6 rounded-2xl border border-line bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Push to everyone</h2>
        <p className="mt-1 text-xs text-fade">A phone or desktop notification to every member who has notifications on. Keep it short: phones show about two lines. Tapping it opens the screen you pick.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr]">
          <label className="text-xs text-fade">
            Title
            <input name="title" maxLength={60} defaultValue="TaDa" className={`${input} mt-1 block w-full`} />
          </label>
          <label className="text-xs text-fade">
            Message
            <input name="body" required maxLength={160} className={`${input} mt-1 block w-full`} placeholder="New this week: color-coded mornings, afternoons and evenings." />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-fade">
            Opens
            <select name="link" defaultValue="today" className={`${input} block`}>
              <option value="today">Today</option>
              <option value="plan">Plan</option>
              <option value="community">Community</option>
              <option value="partners">Partners</option>
              <option value="account">Account</option>
            </select>
          </label>
          <button type="submit" disabled={pushing} className="rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {pushing ? "Sending..." : "Send push to everyone"}
          </button>
        </div>
        <Notice state={pushState} />
      </form>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fade">Pinned now ({pinned.length})</h2>
        <div className="mt-2 space-y-2">
          {pinned.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-white p-3 text-sm">
              <div className="text-xs text-fade">
                {p.by} · {p.type} · {p.createdAt.slice(0, 16).replace("T", " ")}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-ink">{p.text}</p>
              <div className="mt-2 flex gap-2">
                <form action={pinAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="pinned" value="0" />
                  <button type="submit" disabled={pinning} className="rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                    Unpin
                  </button>
                </form>
                <form action={delAction}>
                  <input type="hidden" name="kind" value="post" />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" disabled={deleting} className="rounded-xl bg-coral px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          ))}
          {pinned.length === 0 && <p className="rounded-2xl border border-line bg-white p-4 text-sm text-fade">Nothing pinned right now.</p>}
        </div>
        <Notice state={pinState ?? delState} />
      </section>
    </div>
  );
}
