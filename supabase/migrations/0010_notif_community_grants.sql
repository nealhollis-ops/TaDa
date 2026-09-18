-- 0010: members read and write the new notif_community column.
-- profiles is granted column by column to `authenticated` so email stays hidden;
-- any new profile column must be added here or every profile query that names it
-- fails with "permission denied for table profiles".
grant select (notif_community) on public.profiles to authenticated;
grant update (notif_community) on public.profiles to authenticated;
