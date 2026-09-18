"use client";

import { useState } from "react";
import { Check, Hand, Heart, HelpCircle, MessageCircle, Pencil, RefreshCw, Send, SmilePlus, Trash2, Trophy, X } from "lucide-react";
import { usePlanner } from "../store";
import { Avatar, BadgeStrip, C, Chip, QuoteCard, inputStyle, renderRich } from "../ui";
import { ago } from "@/lib/planner/calendar";
import { PTYPE_META, REACTS } from "@/lib/planner/content";
import type { Post, PostType, ReactKind } from "@/lib/planner/types";

const ICONS = { hi: Hand, question: HelpCircle, win: Trophy, boost: Heart };

export function CommunityScreen() {
  const p = usePlanner();
  const [postType, setPostType] = useState<PostType>("win");
  const [postText, setPostText] = useState("");
  const [feedSort, setFeedSort] = useState<"active" | "new" | "top">("new");
  const [showMile, setShowMile] = useState(true);
  const [feedCount, setFeedCount] = useState(20);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [openReplies, setOpenReplies] = useState<string[]>([]);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState<{ kind: "post" | "reply"; postId: string; replyId?: string; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ kind: "post" | "reply"; postId: string; replyId?: string } | null>(null);
  const [replyReactFor, setReplyReactFor] = useState<string | null>(null);
  const editBox = "w-full rounded-xl border px-3 py-2 text-sm outline-none";

  const ts = (s: string) => new Date(s).getTime();
  const lastAct = (x: Post) => Math.max(ts(x.createdAt), ...x.replies.map((r) => ts(r.createdAt)), 0);
  const score = (x: Post) => Object.values(x.reactions).reduce((a, arr) => a + arr.length, 0) + x.replies.length * 2;
  const filtered = p.posts.filter((x) => x.type === postType && !p.isBlocked(x.userId) && (showMile || !x.milestone));
  const list = [...filtered].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return feedSort === "new" ? ts(b.createdAt) - ts(a.createdAt) : feedSort === "top" ? score(b) - score(a) || ts(b.createdAt) - ts(a.createdAt) : lastAct(b) - lastAct(a);
  });

  const submitReply = (pid: string) => {
    void p.addReply(pid, replyText);
    setReplyFor(null);
    setReplyText("");
  };

  return (
    <div className="px-5 py-5">
      <QuoteCard q={p.quote} />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.navy }}>
          Community
        </h2>
        <button onClick={() => void p.refreshShared()} className="rounded-full p-2" style={{ background: "#fff" }} aria-label="Refresh">
          <RefreshCw size={16} style={{ color: C.navy2 }} className={p.refreshing ? "animate-spin" : ""} />
        </button>
      </div>
      <p className="mb-3 text-xs" style={{ color: C.fade }}>
        Every TaDa member shares this space. Be the kind of voice you&rsquo;d want to hear.
      </p>
      <div className="mb-3 flex gap-2">
        {(Object.keys(PTYPE_META) as PostType[]).map((k) => {
          const v = PTYPE_META[k];
          const Icon = ICONS[k];
          return (
            <button key={k} onClick={() => setPostType(k)} className="flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold" style={{ background: postType === k ? v.color : "#fff", color: postType === k ? v.fg : C.ink }}>
              <Icon size={14} /> {v.tab}
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["new", "New"],
            ["active", "Active"],
            ["top", "Top"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => {
              setFeedSort(k);
              setFeedCount(20);
            }}
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: feedSort === k ? C.navy : "#fff", color: feedSort === k ? C.cream : C.ink }}
          >
            {l}
          </button>
        ))}
        <button onClick={() => setShowMile(!showMile)} className="ml-auto rounded-full px-3 py-1 text-xs font-medium" style={{ background: showMile ? C.goldSoft : "#fff", color: C.ink, border: showMile ? `1px solid ${C.gold}` : "1px solid transparent" }}>
          Milestones {showMile ? "on" : "off"}
        </button>
      </div>
      <div className="mb-4 rounded-2xl p-4" style={{ background: "#fff" }}>
        <textarea
          className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
          rows={2}
          style={inputStyle}
          placeholder={PTYPE_META[postType].placeholder}
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
        />
        <button
          onClick={() => {
            void p.addPost(postType, postText);
            setPostText("");
          }}
          className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: PTYPE_META[postType].color, color: PTYPE_META[postType].fg }}
        >
          {PTYPE_META[postType].cta}
        </button>
      </div>

      {list.slice(0, feedCount).map((post) => {
        const meta = PTYPE_META[post.type] || PTYPE_META.win;
        const Icon = ICONS[post.type] || Trophy;
        const reps = post.replies.filter((r) => !p.isBlocked(r.userId));
        const open = openReplies.includes(post.id);
        const strip = p.stripFor(post.userId);
        return (
          <div key={post.id} className="mb-3 rounded-2xl p-4" style={{ background: "#fff", border: post.milestone || post.pinned ? `2px solid ${C.gold}` : "2px solid transparent" }}>
            <div className="mb-1 flex items-center gap-2">
              <button onClick={() => p.set("viewProfile", post.userId)} className="flex items-center gap-2">
                <Avatar src={p.avatarOf(post.userId)} name={p.nameOf(post.userId)} size={24} />
                <span className="text-xs font-semibold" style={{ color: C.navy }}>
                  {p.nameOf(post.userId)}
                </span>
              </button>
              <BadgeStrip streak={strip.streak} badges={strip.badges} level={strip.level} />
              {post.pinned && <Chip color={C.navy} bg={C.goldSoft}>Pinned</Chip>}
              {post.milestone && <Chip color={C.navy} bg={C.goldSoft}>Milestone</Chip>}
              <Icon size={13} style={{ color: meta.color }} />
              <span className="ml-auto text-xs" style={{ color: C.fade }}>
                {ago(post.createdAt)}
                {post.edited ? " · edited" : ""}
              </span>
              {post.userId === p.me.id && !post.milestone && (
                <span className="flex items-center gap-1">
                  <button onClick={() => setEditing({ kind: "post", postId: post.id, text: post.text })} aria-label="Edit post">
                    <Pencil size={13} style={{ color: C.fade }} />
                  </button>
                  <button onClick={() => setConfirmDel({ kind: "post", postId: post.id })} aria-label="Delete post">
                    <Trash2 size={13} style={{ color: C.fade }} />
                  </button>
                </span>
              )}
            </div>
            {editing?.kind === "post" && editing.postId === post.id ? (
              <div className="mt-1">
                <textarea className={editBox} style={inputStyle} rows={3} maxLength={2000} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      void p.editPost(post.id, editing.text);
                      setEditing(null);
                    }}
                    className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                    style={{ background: C.teal, color: C.ink }}
                  >
                    <Check size={13} /> Save
                  </button>
                  <button onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ background: C.mist, color: C.ink }}>
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : confirmDel?.kind === "post" && confirmDel.postId === post.id ? (
              <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: "#FDE2E2", color: C.ink }}>
                Delete this post and its replies?
                <button
                  onClick={() => {
                    void p.deletePost(post.id);
                    setConfirmDel(null);
                  }}
                  className="rounded-xl px-3 py-1 text-xs font-semibold text-white"
                  style={{ background: C.coral }}
                >
                  Delete
                </button>
                <button onClick={() => setConfirmDel(null)} className="rounded-xl px-3 py-1 text-xs font-semibold" style={{ background: "#fff", color: C.ink }}>
                  Keep it
                </button>
              </div>
            ) : (
              <div className="text-sm" style={{ color: C.ink }}>
                {renderRich(post.text)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {REACTS.filter((r) => (post.reactions[r.id] || []).length > 0).map((r) => {
                const arr = post.reactions[r.id] || [];
                const mine = arr.includes(p.me.id);
                return (
                  <button key={r.id} onClick={() => void p.toggleReact(post.id, r.id as ReactKind)} className="flex items-center gap-1 rounded-full px-2 py-1 text-xs" style={{ background: mine ? C.goldSoft : C.mist, border: mine ? `1px solid ${C.gold}` : "1px solid transparent", color: C.ink }}>
                    <span>{r.e}</span>
                    <span className="font-semibold">{arr.length}</span>
                  </button>
                );
              })}
              <button onClick={() => setReactFor(reactFor === post.id ? null : post.id)} className="flex items-center rounded-full px-2 py-1" style={{ background: "#fff", border: `1px solid ${C.line}` }} aria-label="React">
                <SmilePlus size={15} style={{ color: C.fade }} />
              </button>
            </div>
            {reactFor === post.id && (
              <div className="mt-2 flex items-center gap-1 rounded-full px-2 py-1.5" style={{ background: "#fff", border: `1px solid ${C.line}`, width: "fit-content" }}>
                {REACTS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      void p.toggleReact(post.id, r.id as ReactKind);
                      setReactFor(null);
                    }}
                    className="rounded-full px-1.5 py-0.5 text-lg"
                  >
                    {r.e}
                  </button>
                ))}
              </div>
            )}
            <div>
              <button onClick={() => setOpenReplies(open ? openReplies.filter((x) => x !== post.id) : [...openReplies, post.id])} className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: C.teal }}>
                <MessageCircle size={13} />
                {reps.length} {reps.length === 1 ? "reply" : "replies"}
              </button>
              {open && (
                <div>
                  {reps.map((r) => (
                    <div key={r.id} className="ml-3 mt-2 py-1 pl-3 text-sm" style={{ borderLeft: `2px solid ${C.line}`, color: C.ink }}>
                      <div className="flex items-start gap-2">
                        <button onClick={() => p.set("viewProfile", r.userId)}>
                          <Avatar src={p.avatarOf(r.userId)} name={p.nameOf(r.userId)} size={18} />
                        </button>
                        {editing?.kind === "reply" && editing.replyId === r.id ? (
                          <span className="flex-1">
                            <textarea className={editBox} style={inputStyle} rows={2} maxLength={1000} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                            <span className="mt-1.5 flex gap-2">
                              <button
                                onClick={() => {
                                  void p.editReply(post.id, r.id, editing.text);
                                  setEditing(null);
                                }}
                                className="flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold"
                                style={{ background: C.teal, color: C.ink }}
                              >
                                <Check size={12} /> Save
                              </button>
                              <button onClick={() => setEditing(null)} className="flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-semibold" style={{ background: C.mist, color: C.ink }}>
                                <X size={12} /> Cancel
                              </button>
                            </span>
                          </span>
                        ) : (
                          <span className="flex-1">
                            <span className="font-semibold" style={{ color: C.navy2 }}>
                              {p.nameOf(r.userId)}:{" "}
                            </span>
                            {renderRich(r.text)}
                            {r.edited && (
                              <span className="ml-1 text-[10px]" style={{ color: C.fade }}>
                                edited
                              </span>
                            )}
                          </span>
                        )}
                        <span className="flex shrink-0 items-center gap-2">
                          {r.userId === p.me.id && !editing && (
                            <>
                              <button onClick={() => setEditing({ kind: "reply", postId: post.id, replyId: r.id, text: r.text })} aria-label="Edit reply">
                                <Pencil size={12} style={{ color: C.fade }} />
                              </button>
                              <button onClick={() => setConfirmDel({ kind: "reply", postId: post.id, replyId: r.id })} aria-label="Delete reply">
                                <Trash2 size={12} style={{ color: C.fade }} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setReplyFor(post.id);
                              setReplyText(`@${p.nameOf(r.userId)} `);
                            }}
                            className="text-xs font-bold"
                            style={{ color: C.gold }}
                          >
                            @
                          </button>
                        </span>
                      </div>
                      {confirmDel?.kind === "reply" && confirmDel.replyId === r.id && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-xl px-3 py-1.5 text-xs" style={{ background: "#FDE2E2", color: C.ink }}>
                          Delete this reply?
                          <button
                            onClick={() => {
                              void p.deleteReply(post.id, r.id);
                              setConfirmDel(null);
                            }}
                            className="rounded-xl px-2.5 py-1 font-semibold text-white"
                            style={{ background: C.coral }}
                          >
                            Delete
                          </button>
                          <button onClick={() => setConfirmDel(null)} className="rounded-xl px-2.5 py-1 font-semibold" style={{ background: "#fff", color: C.ink }}>
                            Keep it
                          </button>
                        </div>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {REACTS.filter((k) => (r.reactions[k.id] || []).length > 0).map((k) => {
                          const arr = r.reactions[k.id] || [];
                          const mine = arr.includes(p.me.id);
                          return (
                            <button key={k.id} onClick={() => void p.toggleReplyReact(post.id, r.id, k.id as ReactKind)} className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: mine ? C.goldSoft : C.mist, border: mine ? `1px solid ${C.gold}` : "1px solid transparent", color: C.ink }}>
                              <span>{k.e}</span>
                              <span className="font-semibold">{arr.length}</span>
                            </button>
                          );
                        })}
                        <button onClick={() => setReplyReactFor(replyReactFor === r.id ? null : r.id)} className="flex items-center rounded-full px-1.5 py-0.5" style={{ background: "#fff", border: `1px solid ${C.line}` }} aria-label="React to reply">
                          <SmilePlus size={13} style={{ color: C.fade }} />
                        </button>
                        {replyReactFor === r.id && (
                          <span className="flex items-center gap-0.5 rounded-full px-1.5 py-1" style={{ background: "#fff", border: `1px solid ${C.line}` }}>
                            {REACTS.map((k) => (
                              <button
                                key={k.id}
                                onClick={() => {
                                  void p.toggleReplyReact(post.id, r.id, k.id as ReactKind);
                                  setReplyReactFor(null);
                                }}
                                className="rounded-full px-1 text-base"
                              >
                                {k.e}
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {replyFor === post.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                        style={inputStyle}
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitReply(post.id);
                        }}
                        autoFocus
                      />
                      <button onClick={() => submitReply(post.id)} className="rounded-xl px-3" style={{ background: C.teal }} aria-label="Send reply">
                        <Send size={15} style={{ color: "#fff" }} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReplyFor(post.id);
                        setReplyText(`@${p.nameOf(post.userId)} `);
                      }}
                      className="mt-2 text-xs font-medium"
                      style={{ color: C.teal }}
                    >
                      Reply
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {filtered.length > feedCount && (
        <button onClick={() => setFeedCount(feedCount + 20)} className="mb-3 w-full rounded-xl py-2.5 text-sm font-semibold" style={{ background: "#fff", color: C.navy2 }}>
          Show more posts
        </button>
      )}
      {filtered.length === 0 && (
        <div className="rounded-2xl p-6 text-center text-sm" style={{ background: "#fff", color: C.fade }}>
          {PTYPE_META[postType].empty}
        </div>
      )}
    </div>
  );
}
