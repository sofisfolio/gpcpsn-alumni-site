-- Migration 10: performance tuning + contact-form flood guard.
-- Policies keep the same meaning; auth.uid()/has_permission() are wrapped in (select ...)
-- so Postgres evaluates them once per query instead of once per row.

-- 1. Indexes on foreign keys
create index if not exists articles_category_id_idx on public.articles(category_id);
create index if not exists events_category_id_idx on public.events(category_id);
create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists role_permissions_permission_idx on public.role_permissions(permission);

-- 2. articles
drop policy if exists articles_delete on public.articles;
drop policy if exists articles_insert on public.articles;
drop policy if exists articles_select on public.articles;
drop policy if exists articles_update on public.articles;
create policy articles_delete on public.articles for delete to authenticated using (
  ((author_id = (select auth.uid())) and status = 'draft') or (select private.has_permission('articles.review')));
create policy articles_insert on public.articles for insert to authenticated with check (
  author_id = (select auth.uid()) and (select private.is_verified())
  and (status in ('draft','pending') or (status = 'published' and (select private.has_permission('articles.publish')))));
create policy articles_select on public.articles for select to authenticated using (
  author_id = (select auth.uid()) or (select private.has_permission('articles.review')));
create policy articles_update on public.articles for update to authenticated using (
  ((author_id = (select auth.uid())) and (status in ('draft','rejected')
     or (status in ('pending','published') and (select private.has_permission('articles.publish')))))
  or (select private.has_permission('articles.review')))
with check (
  ((author_id = (select auth.uid())) and (status in ('draft','pending')
     or (status = 'published' and (select private.has_permission('articles.publish')))))
  or (select private.has_permission('articles.review')));

-- 3. jobs
drop policy if exists jobs_delete on public.jobs;
drop policy if exists jobs_insert on public.jobs;
drop policy if exists jobs_select on public.jobs;
drop policy if exists jobs_update on public.jobs;
create policy jobs_delete on public.jobs for delete to authenticated using (
  ((submitted_by = (select auth.uid())) and status in ('pending','rejected','withdrawn'))
  or (select private.has_permission('jobs.review')));
create policy jobs_insert on public.jobs for insert to authenticated with check (
  submitted_by = (select auth.uid()) and (select private.is_verified()));
create policy jobs_select on public.jobs for select to authenticated using (
  submitted_by = (select auth.uid()) or (select private.has_permission('jobs.review')));
create policy jobs_update on public.jobs for update to authenticated using (
  ((submitted_by = (select auth.uid())) and status in ('pending','rejected','approved'))
  or (select private.has_permission('jobs.review')))
with check (submitted_by = (select auth.uid()) or (select private.has_permission('jobs.review')));

-- 4. reports, registrations, profiles, profile_contact
drop policy if exists reports_insert on public.content_reports;
drop policy if exists reports_select on public.content_reports;
create policy reports_insert on public.content_reports for insert to authenticated with check (
  reporter_id = (select auth.uid()) and (select private.is_verified()));
create policy reports_select on public.content_reports for select to authenticated using (
  reporter_id = (select auth.uid()) or (select private.has_permission('reports.handle')));

drop policy if exists registrations_select on public.event_registrations;
create policy registrations_select on public.event_registrations for select to authenticated using (
  user_id = (select auth.uid()) or (select private.has_permission('events.manage')));

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid()) or (select private.has_permission('members.review')));
create policy profiles_update on public.profiles for update to authenticated using (
  id = (select auth.uid()) or (select private.has_permission('members.review')))
with check (id = (select auth.uid()) or (select private.has_permission('members.review')));

drop policy if exists profile_contact_own on public.profile_contact;
create policy profile_contact_own on public.profile_contact for all to authenticated using (
  profile_id = (select auth.uid()) or (select private.has_permission('members.review')))
with check (profile_id = (select auth.uid()));

-- 5. Remove duplicate permissive SELECT policies (split write policies per action)
-- education / experience
drop policy if exists education_write on public.profile_education;
create policy education_insert on public.profile_education for insert to authenticated with check (profile_id = (select auth.uid()));
create policy education_update on public.profile_education for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy education_delete on public.profile_education for delete to authenticated using (profile_id = (select auth.uid()));
drop policy if exists experience_write on public.profile_experience;
create policy experience_insert on public.profile_experience for insert to authenticated with check (profile_id = (select auth.uid()));
create policy experience_update on public.profile_experience for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy experience_delete on public.profile_experience for delete to authenticated using (profile_id = (select auth.uid()));

-- site.manage tables: admin policy split into insert/update/delete, read policy stays
do $$
declare r record;
begin
  for r in select * from (values
    ('article_categories','article_categories_admin'),
    ('departments','departments_admin'),
    ('event_categories','event_categories_admin'),
    ('site_settings','settings_admin'),
    ('testimonials','testimonials_admin')) v(t,p)
  loop
    execute format('drop policy if exists %I on public.%I', r.p, r.t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.has_permission(''site.manage'')))', r.t||'_ins', r.t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.has_permission(''site.manage''))) with check ((select private.has_permission(''site.manage'')))', r.t||'_upd', r.t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select private.has_permission(''site.manage'')))', r.t||'_del', r.t);
  end loop;
end $$;

-- featured_alumni: admin ALL already covers select; drop the redundant select policy
drop policy if exists featured_select on public.featured_alumni;
drop policy if exists featured_admin on public.featured_alumni;
create policy featured_admin on public.featured_alumni for all to authenticated
  using ((select private.has_permission('site.manage'))) with check ((select private.has_permission('site.manage')));

-- 6. Contact form flood guard: at most 30 new messages per rolling hour site-wide
create or replace function private.contact_flood_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many messages right now. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.contact_flood_guard() from public, anon, authenticated;
drop trigger if exists contact_flood_guard on public.contact_messages;
create trigger contact_flood_guard before insert on public.contact_messages
  for each row execute function private.contact_flood_guard();
