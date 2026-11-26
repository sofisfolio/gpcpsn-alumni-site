-- GPCPSN Alumni Network | 2/4 security
-- Row Level Security on every table, least-privilege grants, privacy-safe public views, and RPCs.
-- Model: base tables are readable only by their owner and administrators. The public (and other members)
-- read only through views that hide private columns and unapproved rows.

-- ---------------------------------------------------------------- 0. lock everything down first
-- Supabase grants new tables to anon/authenticated by default. Remove that, then grant back deliberately.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.is_verified(), private.can_view_profile(uuid), private.slugify(text) to anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- ---------------------------------------------------------------- 1. enable RLS on every table
alter table public.departments enable row level security;
alter table public.event_categories enable row level security;
alter table public.article_categories enable row level security;
alter table public.app_admins enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_contact enable row level security;
alter table public.profile_experience enable row level security;
alter table public.profile_education enable row level security;
alter table public.jobs enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.articles enable row level security;
alter table public.content_reports enable row level security;
alter table public.testimonials enable row level security;
alter table public.featured_alumni enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;
alter table public.moderation_logs enable row level security;

-- ---------------------------------------------------------------- 2. table privileges (what roles may even attempt)
grant select on public.departments, public.event_categories, public.article_categories,
                public.testimonials, public.site_settings to anon, authenticated;
grant insert, update, delete on public.departments, public.event_categories, public.article_categories,
                public.testimonials, public.site_settings, public.featured_alumni to authenticated;  -- admin-only via policies
grant select on public.app_admins, public.featured_alumni, public.moderation_logs to authenticated;
grant select, update on public.profiles to authenticated;                       -- no insert (trigger) and no delete
grant select, insert, update, delete on public.profile_contact, public.profile_experience,
                public.profile_education to authenticated;
grant select on public.profile_experience, public.profile_education to anon;
grant select, insert, update, delete on public.jobs, public.articles to authenticated;
grant select, insert, update, delete on public.events to authenticated;         -- admin-only via policies
grant select on public.event_registrations to authenticated;                    -- writes only via RPC functions
grant select, insert on public.content_reports to authenticated;
grant update on public.content_reports to authenticated;                        -- admin-only via policy
grant insert on public.contact_messages to anon, authenticated;
grant select, update on public.contact_messages to authenticated;               -- admin-only via policies

-- ---------------------------------------------------------------- 3. policies
-- reference data: readable by all, writable by admins
create policy departments_read on public.departments for select to anon, authenticated using (is_active or private.is_admin());
create policy departments_admin on public.departments for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy event_categories_read on public.event_categories for select to anon, authenticated using (true);
create policy event_categories_admin on public.event_categories for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy article_categories_read on public.article_categories for select to anon, authenticated using (true);
create policy article_categories_admin on public.article_categories for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- admins: a user may learn whether THEY are an admin; nobody can write via the API
create policy app_admins_self on public.app_admins for select to authenticated using (user_id = auth.uid());

-- profiles: own row or admin; verification fields protected by trigger
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or private.is_admin()) with check (id = auth.uid() or private.is_admin());

create policy profile_contact_own on public.profile_contact for all to authenticated
  using (profile_id = auth.uid() or private.is_admin()) with check (profile_id = auth.uid());

create policy experience_read on public.profile_experience for select to anon, authenticated using (private.can_view_profile(profile_id));
create policy experience_write on public.profile_experience for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy education_read on public.profile_education for select to anon, authenticated using (private.can_view_profile(profile_id));
create policy education_write on public.profile_education for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- jobs: verified members create; owner reads/edits/removes own; admin everything
create policy jobs_select on public.jobs for select to authenticated using (submitted_by = auth.uid() or private.is_admin());
create policy jobs_insert on public.jobs for insert to authenticated with check (submitted_by = auth.uid() and private.is_verified());
create policy jobs_update on public.jobs for update to authenticated
  using ((submitted_by = auth.uid() and status in ('pending', 'rejected', 'approved')) or private.is_admin())
  with check (submitted_by = auth.uid() or private.is_admin());
create policy jobs_delete on public.jobs for delete to authenticated
  using ((submitted_by = auth.uid() and status in ('pending', 'rejected', 'withdrawn')) or private.is_admin());

-- events: admin-managed; members interact only through the RPC functions below
create policy events_admin on public.events for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy registrations_select on public.event_registrations for select to authenticated
  using (user_id = auth.uid() or private.is_admin());

-- articles: verified members write drafts; only drafts/rejected can be edited by the author
create policy articles_select on public.articles for select to authenticated using (author_id = auth.uid() or private.is_admin());
create policy articles_insert on public.articles for insert to authenticated
  with check (author_id = auth.uid() and private.is_verified() and status in ('draft', 'pending'));
create policy articles_update on public.articles for update to authenticated
  using ((author_id = auth.uid() and status in ('draft', 'rejected')) or private.is_admin())
  with check ((author_id = auth.uid() and status in ('draft', 'pending')) or private.is_admin());
create policy articles_delete on public.articles for delete to authenticated
  using ((author_id = auth.uid() and status = 'draft') or private.is_admin());

-- reports
create policy reports_insert on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid() and private.is_verified());
create policy reports_select on public.content_reports for select to authenticated using (reporter_id = auth.uid() or private.is_admin());
create policy reports_update on public.content_reports for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- site content
create policy testimonials_read on public.testimonials for select to anon, authenticated using (is_approved or private.is_admin());
create policy testimonials_admin on public.testimonials for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_admin on public.site_settings for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy featured_select on public.featured_alumni for select to authenticated using (private.is_admin());
create policy featured_admin on public.featured_alumni for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- contact form: anyone may SUBMIT (strict column checks); only admins read. Add Cloudflare Turnstile in Phase 8.
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (handled = false);
create policy contact_select on public.contact_messages for select to authenticated using (private.is_admin());
create policy contact_update on public.contact_messages for update to authenticated using (private.is_admin()) with check (private.is_admin());

-- audit log: admins read; rows are written only by the security-definer trigger
create policy moderation_logs_select on public.moderation_logs for select to authenticated using (private.is_admin());

-- ---------------------------------------------------------------- 4. public views (privacy-safe projections)
-- These views run with the owner's rights ON PURPOSE: they are the only door to other people's data, and each one
-- selects only safe columns and only approved/visible rows.
create or replace view public.directory_profiles with (security_invoker = false) as
select p.id, p.full_name, p.headline, p.graduation_year, d.name as department, d.slug as department_slug,
       p.current_company, p.current_position, p.city, p.country, p.industry, p.bio,
       p.skills, p.achievements, p.website_url, p.linkedin_url, p.avatar_path, p.cover_path
from public.profiles p
left join public.departments d on d.id = p.department_id
where p.verification_status = 'verified'
  and (p.profile_visibility = 'public' or (p.profile_visibility = 'members' and auth.uid() is not null));

create or replace view public.directory_contact with (security_invoker = false) as
select c.profile_id, c.contact_email, c.phone
from public.profile_contact c
join public.profiles p on p.id = c.profile_id
where p.verification_status = 'verified' and p.contact_visibility = 'members'
  and p.profile_visibility in ('public', 'members') and auth.uid() is not null;

create or replace view public.jobs_public with (security_invoker = false) as
select j.id, j.title, j.company, j.company_website, j.company_logo_path, j.location, j.work_mode, j.employment_type,
       j.industry, j.experience_min_years, j.experience_max_years, j.salary_text, j.description, j.responsibilities,
       j.qualifications, j.skills, j.apply_url,
       case when auth.uid() is not null then j.apply_email end as apply_email,   -- hidden from anonymous scrapers
       j.deadline, j.featured, j.published_at, j.created_at
from public.jobs j
where j.status = 'approved' and (j.deadline is null or j.deadline >= current_date);

create or replace view public.events_public with (security_invoker = false) as
select e.id, e.slug, e.title, e.description, e.banner_path, e.starts_at, e.ends_at, e.timezone, e.venue, e.address,
       e.is_online, c.name as category, c.slug as category_slug, e.capacity, e.registration_deadline, e.fee_text,
       e.organizer, e.agenda, e.speakers, e.status, e.featured,
       coalesce((select sum(r.attendees) from public.event_registrations r where r.event_id = e.id and r.status = 'registered'), 0)::int as seats_taken
from public.events e
left join public.event_categories c on c.id = e.category_id
where e.status in ('published', 'cancelled');

create or replace view public.articles_public with (security_invoker = false) as
select a.id, a.slug, a.title, a.summary, a.cover_path, a.content, a.featured, a.published_at,
       c.name as category, c.slug as category_slug,
       p.full_name as author_name, p.graduation_year as author_graduation_year
from public.articles a
join public.profiles p on p.id = a.author_id
left join public.article_categories c on c.id = a.category_id
where a.status = 'published';

create or replace view public.featured_alumni_public with (security_invoker = false) as
select dp.*, f.sort_order
from public.featured_alumni f
join public.directory_profiles dp on dp.id = f.profile_id;

create or replace view public.site_stats with (security_invoker = false) as
select
  (select count(*) from public.profiles where verification_status = 'verified')::int as verified_members,
  (select count(*) from public.jobs_public)::int as open_jobs,
  (select count(*) from public.events where status = 'published' and starts_at >= now())::int as upcoming_events,
  (select count(*) from public.articles where status = 'published')::int as published_articles,
  (select count(distinct country) from public.directory_profiles where country is not null)::int as countries;

grant select on public.directory_profiles, public.jobs_public, public.events_public, public.articles_public,
                public.featured_alumni_public, public.site_stats to anon, authenticated;
grant select on public.directory_contact to authenticated;

-- ---------------------------------------------------------------- 5. RPC functions (the only way to register for events)
create or replace function public.register_for_event(p_event_id uuid, p_attendees smallint default 1, p_notes text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  ev public.events%rowtype;
  existing public.event_registrations%rowtype;
  taken int;
  had_row boolean;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.is_verified() then raise exception 'not_verified' using errcode = '42501'; end if;
  if p_attendees is null or p_attendees < 1 or p_attendees > 4 then raise exception 'invalid_attendees' using errcode = '22023'; end if;

  select * into ev from public.events where id = p_event_id for update;          -- row lock: no overbooking under concurrency
  if not found or ev.status <> 'published' then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  if ev.starts_at <= now() or (ev.registration_deadline is not null and ev.registration_deadline <= now()) then
    raise exception 'registration_closed' using errcode = 'P0001';
  end if;

  select * into existing from public.event_registrations where event_id = p_event_id and user_id = uid;
  had_row := found;
  if had_row and existing.status = 'registered' then raise exception 'already_registered' using errcode = '23505'; end if;

  select coalesce(sum(attendees), 0) into taken from public.event_registrations where event_id = p_event_id and status = 'registered';
  if ev.capacity is not null and taken + p_attendees > ev.capacity then raise exception 'event_full' using errcode = 'P0001'; end if;

  if had_row then
    update public.event_registrations set status = 'registered', attendees = p_attendees, notes = p_notes, cancelled_at = null
    where id = existing.id;
  else
    insert into public.event_registrations (event_id, user_id, attendees, notes) values (p_event_id, uid, p_attendees, p_notes);
  end if;
  return 'registered';
end $$;

create or replace function public.cancel_event_registration(p_event_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update public.event_registrations r set status = 'cancelled', cancelled_at = now()
  from public.events e
  where r.event_id = p_event_id and r.user_id = auth.uid() and r.status = 'registered'
    and e.id = r.event_id and e.starts_at > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- The meeting link of an online event is visible only to registered members and admins.
create or replace function public.get_event_online_url(p_event_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select e.online_url from public.events e
  where e.id = p_event_id and e.status = 'published'
    and (private.is_admin() or exists (select 1 from public.event_registrations r
         where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'registered'))
$$;

revoke all on function public.register_for_event(uuid, smallint, text), public.cancel_event_registration(uuid),
                       public.get_event_online_url(uuid) from public, anon;
grant execute on function public.register_for_event(uuid, smallint, text), public.cancel_event_registration(uuid),
                          public.get_event_online_url(uuid) to authenticated;
