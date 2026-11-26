-- GPCPSN Alumni Network | 9 - registrations list for event managers
-- Names and emails of registrants are not readable through the normal tables (only the member themself and members.review can read profiles).
-- This function lets people with events.manage see who registered for ONE event, nothing else.
create or replace function public.admin_event_registrations(p_event_id uuid)
returns table (user_id uuid, full_name text, email text, graduation_year smallint, attendees smallint, notes text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('events.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select r.user_id, p.full_name, u.email::text, p.graduation_year, r.attendees, r.notes, r.status, r.created_at
    from public.event_registrations r
    join public.profiles p on p.id = r.user_id
    join auth.users u on u.id = r.user_id
    where r.event_id = p_event_id
    order by r.status, r.created_at;
end $$;
revoke all on function public.admin_event_registrations(uuid) from public, anon;
grant execute on function public.admin_event_registrations(uuid) to authenticated;
