-- 0026: let someone fix a note they wrote on assigned work.
--
-- 0020 made notes insert-only on purpose, so a record of what was said stayed
-- put. In practice the thing people most want to change is a typo or a half
-- sentence they sent too early, and having no way to do that pushes them into
-- writing a second note correcting the first. The thread gets worse, not more
-- honest. Posts and replies already work this way: edit your own, and the row
-- carries edited_at so nobody is misled about it being the original wording.
--
-- Only the author. Not the boss, not an admin: this is a small private thread
-- between two people about one task, and someone else rewriting your words
-- there would be worse than leaving the typo.
--
-- Idempotent: safe to replay.

alter table public.assignment_notes add column if not exists edited_at timestamptz;

comment on column public.assignment_notes.edited_at is
  'Set when the author changed the text. Null means it is as first written.';

-- WITH CHECK as well as USING: without it the policy guards which row you may
-- edit but not what you may turn it into, so a note could be re-pointed at
-- another assignment or handed to another member.
drop policy if exists assignment_notes_update on public.assignment_notes;
create policy assignment_notes_update on public.assignment_notes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_see_assignment(assignment_id));

grant update on public.assignment_notes to authenticated, service_role;
