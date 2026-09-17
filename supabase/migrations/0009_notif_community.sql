-- 0009: per-member switch for community notifications (replies and @mentions).
-- Device alerts and the bell for direct messages, partners, teams, badges and
-- announcements stay on notif_on; this one only governs community chatter.
alter table public.profiles add column if not exists notif_community boolean not null default true;
