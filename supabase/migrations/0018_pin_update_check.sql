-- 0018: stop a member pinning their own post.
--
-- posts_update was written with a USING clause and no WITH CHECK. Postgres then
-- reuses USING for the new row, so "user_id = auth.uid() or is_admin()" passed
-- whatever the member set `pinned` to. posts_insert already refused a pinned
-- post at creation time; this closes the same hole on update, now that the app
-- has a pin control.
--
-- Idempotent: safe to replay.

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() or public.is_admin()) and (not pinned or public.is_admin()));
