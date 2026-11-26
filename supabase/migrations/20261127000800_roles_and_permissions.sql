-- GPCPSN Alumni Network | 8 - roles and permissions (WordPress-style staff accounts)
-- Replaces the single "administrator" switch (app_admins) with editable roles. A role is a named set of permissions;
-- a user can hold several roles. "superadmin" implicitly has every permission and is the only role that cannot be edited.
-- Everything is enforced here in the database (policies + functions), never only in the website.
-- Role/permission tables have RLS on and NO policies or grants: they can be read or changed only through the functions below.

-- ---------------------------------------------------------------- tables
create table public.permissions (
  key text primary key,
  label text not null,
  grp text not null,
  description text not null,
  sort_order int not null default 0
);
create table public.roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null check (char_length(name) between 2 and 40),
  description text check (char_length(description) <= 200),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.role_permissions (
  role_key text not null references public.roles (key) on delete cascade,
  permission text not null references public.permissions (key) on delete cascade,
  primary key (role_key, permission)
);
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_key text not null references public.roles (key) on delete restrict,
  granted_by uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, role_key)
);
create index user_roles_role_idx on public.user_roles (role_key);

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
revoke all on public.permissions, public.roles, public.role_permissions, public.user_roles from anon, authenticated;

insert into public.permissions (key, label, grp, description, sort_order) values
  ('dashboard.view',  'See the staff dashboard',      'General',  'Open the staff panel and see counts and recent activity.', 1),
  ('members.review',  'Verify alumni',                'Alumni',   'See applicants (including their email), then verify, reject or suspend them.', 2),
  ('jobs.review',     'Review jobs',                  'Jobs',     'Approve, reject, feature or take down any job listing.', 3),
  ('jobs.publish',    'Publish jobs directly',        'Jobs',     'Jobs posted by this person go live without waiting for review.', 4),
  ('events.manage',   'Manage events',                'Events',   'Create, edit, publish and cancel events; see registrations.', 5),
  ('articles.publish','Publish articles directly',    'Articles', 'Blogs and news written by this person go live without waiting for review.', 6),
  ('articles.review', 'Review articles',              'Articles', 'Approve, reject, edit or unpublish any article.', 7),
  ('reports.handle',  'Handle reports',               'Moderation','Read member reports and take content down.', 8),
  ('messages.read',   'Read contact messages',        'Inbox',    'Read and mark messages sent through the website contact form.', 9),
  ('site.manage',     'Manage site content',          'Site',     'Testimonials, featured alumni, categories, departments and site settings.', 10),
  ('audit.view',      'See the full activity log',    'Moderation','See who changed what, and when.', 11),
  ('roles.manage',    'Manage staff and roles',       'Staff',    'Give or remove roles, and create or edit roles. Treat as superadmin-level.', 12);

insert into public.roles (key, name, description, is_system) values
  ('superadmin', 'Superadmin', 'Full control, including staff and roles. Cannot be edited or removed.', true),
  ('admin',      'Admin',      'Runs the network day to day. Everything except managing staff and roles.', false),
  ('faculty',    'Faculty',    'Faculty and staff contributors: review alumni and jobs, publish articles, jobs and events.', false);

insert into public.role_permissions (role_key, permission)
  select 'admin', key from public.permissions where key <> 'roles.manage';
insert into public.role_permissions (role_key, permission) values
  ('faculty','dashboard.view'), ('faculty','members.review'), ('faculty','jobs.review'), ('faculty','jobs.publish'),
  ('faculty','events.manage'), ('faculty','articles.publish'), ('faculty','articles.review'),
  ('faculty','reports.handle'), ('faculty','messages.read');

-- ---------------------------------------------------------------- helpers used by policies
create or replace function private.has_permission(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and (ur.role_key = 'superadmin'
           or exists (select 1 from public.role_permissions rp where rp.role_key = ur.role_key and rp.permission = p)))
$$;

create or replace function private.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role_key = 'superadmin')
$$;

-- "Verified" now also covers staff, so faculty can use member features (register for events, upload images) without being alumni.
create or replace function private.is_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.verification_status = 'verified')
      or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid())
$$;

create or replace function private.can_view_profile(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid = auth.uid()
      or private.has_permission('members.review')
      or exists (
        select 1 from public.profiles p
        where p.id = pid and p.verification_status = 'verified'
          and (p.profile_visibility = 'public' or (p.profile_visibility = 'members' and auth.uid() is not null))
      )
$$;

revoke all on function private.has_permission(text), private.is_superadmin() from public, anon, authenticated;
grant execute on function private.has_permission(text), private.is_superadmin() to anon, authenticated;

-- ---------------------------------------------------------------- triggers that used the old admin check
create or replace function private.guard_profiles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.has_permission('members.review') then
    if new.id is distinct from old.id then
      raise exception 'profile id is immutable' using errcode = '42501';
    end if;
    if new.verification_status is distinct from old.verification_status
       or new.verification_note is distinct from old.verification_note then
      raise exception 'verification fields can only be changed by an administrator' using errcode = '42501';
    end if;
    if old.verification_status in ('verified', 'rejected')
       and (new.graduation_year is distinct from old.graduation_year
         or new.department_id is distinct from old.department_id
         or new.enrollment_no is distinct from old.enrollment_no) then
      new.verification_status := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function private.guard_jobs() returns trigger
language plpgsql set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reviewer boolean := auth.uid() is null or private.has_permission('jobs.review');   -- no user = SQL editor / server
  publisher boolean := private.has_permission('jobs.publish');
begin
  if tg_op = 'INSERT' then
    if not reviewer then
      new.featured := false; new.rejection_reason := null; new.submitted_by := actor;
      if publisher then new.status := 'approved'; new.published_at := coalesce(new.published_at, now());
      else new.status := 'pending'; new.published_at := null; end if;
    else
      if actor is not null and publisher and new.status = 'pending' then new.status := 'approved'; end if;   -- publisher-reviewers also skip the queue
      if new.status = 'approved' then new.published_at := coalesce(new.published_at, now()); end if;
    end if;
    return new;
  end if;
  if not reviewer then
    new.submitted_by := old.submitted_by;
    new.featured := old.featured;
    if new.status = 'withdrawn' then
      new.published_at := old.published_at; new.rejection_reason := old.rejection_reason;
    elsif publisher and old.status <> 'rejected' then      -- a reviewer's rejection cannot be undone by editing
      new.status := 'approved'; new.published_at := coalesce(old.published_at, now()); new.rejection_reason := null;
    else                                                    -- any edit sends the listing back for review
      new.status := 'pending'; new.published_at := null; new.rejection_reason := null;
    end if;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function private.guard_articles() returns trigger
language plpgsql set search_path = '' as $$
declare
  actor uuid := auth.uid();
  reviewer boolean := auth.uid() is null or private.has_permission('articles.review');
  publisher boolean := private.has_permission('articles.publish');
begin
  if tg_op = 'INSERT' then
    if new.slug is null or new.slug = '' then
      new.slug := coalesce(nullif(private.slugify(new.title), ''), 'article') || '-' || substr(new.id::text, 1, 8);
    end if;
    if not reviewer then
      new.featured := false; new.rejection_reason := null; new.author_id := actor; new.published_at := null;
      if new.status = 'published' and publisher then new.published_at := now();
      elsif new.status not in ('draft', 'pending') then new.status := 'draft'; end if;
    elsif new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;
  if not reviewer then
    new.author_id := old.author_id; new.featured := old.featured; new.slug := old.slug;
    if publisher and new.status = 'published' and old.status in ('rejected', 'archived') then new.status := 'pending'; end if;
    if new.status = 'published' and publisher then new.published_at := coalesce(old.published_at, now());
    else new.published_at := old.published_at; end if;
    new.rejection_reason := case when new.status = 'pending' then null else old.rejection_reason end;
  elsif new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- policies: swap "is admin" for the specific permission
drop policy departments_read on public.departments;
drop policy departments_admin on public.departments;
create policy departments_read on public.departments for select to anon, authenticated using (is_active or private.has_permission('site.manage'));
create policy departments_admin on public.departments for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));
drop policy event_categories_admin on public.event_categories;
create policy event_categories_admin on public.event_categories for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));
drop policy article_categories_admin on public.article_categories;
create policy article_categories_admin on public.article_categories for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));

drop policy profiles_select on public.profiles;
drop policy profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or private.has_permission('members.review'));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or private.has_permission('members.review')) with check (id = auth.uid() or private.has_permission('members.review'));

drop policy profile_contact_own on public.profile_contact;
create policy profile_contact_own on public.profile_contact for all to authenticated
  using (profile_id = auth.uid() or private.has_permission('members.review')) with check (profile_id = auth.uid());

drop policy jobs_select on public.jobs;
drop policy jobs_update on public.jobs;
drop policy jobs_delete on public.jobs;
create policy jobs_select on public.jobs for select to authenticated using (submitted_by = auth.uid() or private.has_permission('jobs.review'));
create policy jobs_update on public.jobs for update to authenticated
  using ((submitted_by = auth.uid() and status in ('pending', 'rejected', 'approved')) or private.has_permission('jobs.review'))
  with check (submitted_by = auth.uid() or private.has_permission('jobs.review'));
create policy jobs_delete on public.jobs for delete to authenticated
  using ((submitted_by = auth.uid() and status in ('pending', 'rejected', 'withdrawn')) or private.has_permission('jobs.review'));

drop policy events_admin on public.events;
drop policy registrations_select on public.event_registrations;
create policy events_admin on public.events for all to authenticated using (private.has_permission('events.manage')) with check (private.has_permission('events.manage'));
create policy registrations_select on public.event_registrations for select to authenticated
  using (user_id = auth.uid() or private.has_permission('events.manage'));

drop policy articles_select on public.articles;
drop policy articles_insert on public.articles;
drop policy articles_update on public.articles;
drop policy articles_delete on public.articles;
create policy articles_select on public.articles for select to authenticated using (author_id = auth.uid() or private.has_permission('articles.review'));
create policy articles_insert on public.articles for insert to authenticated
  with check (author_id = auth.uid() and private.is_verified()
              and (status in ('draft', 'pending') or (status = 'published' and private.has_permission('articles.publish'))));
create policy articles_update on public.articles for update to authenticated
  using ((author_id = auth.uid() and (status in ('draft', 'rejected') or (status in ('pending', 'published') and private.has_permission('articles.publish'))))
         or private.has_permission('articles.review'))
  with check ((author_id = auth.uid() and (status in ('draft', 'pending') or (status = 'published' and private.has_permission('articles.publish'))))
              or private.has_permission('articles.review'));
create policy articles_delete on public.articles for delete to authenticated
  using ((author_id = auth.uid() and status = 'draft') or private.has_permission('articles.review'));

drop policy reports_select on public.content_reports;
drop policy reports_update on public.content_reports;
create policy reports_select on public.content_reports for select to authenticated using (reporter_id = auth.uid() or private.has_permission('reports.handle'));
create policy reports_update on public.content_reports for update to authenticated using (private.has_permission('reports.handle')) with check (private.has_permission('reports.handle'));

drop policy testimonials_read on public.testimonials;
drop policy testimonials_admin on public.testimonials;
drop policy settings_admin on public.site_settings;
drop policy featured_select on public.featured_alumni;
drop policy featured_admin on public.featured_alumni;
create policy testimonials_read on public.testimonials for select to anon, authenticated using (is_approved or private.has_permission('site.manage'));
create policy testimonials_admin on public.testimonials for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));
create policy settings_admin on public.site_settings for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));
create policy featured_select on public.featured_alumni for select to authenticated using (private.has_permission('site.manage'));
create policy featured_admin on public.featured_alumni for all to authenticated using (private.has_permission('site.manage')) with check (private.has_permission('site.manage'));

drop policy contact_select on public.contact_messages;
drop policy contact_update on public.contact_messages;
create policy contact_select on public.contact_messages for select to authenticated using (private.has_permission('messages.read'));
create policy contact_update on public.contact_messages for update to authenticated using (private.has_permission('messages.read')) with check (private.has_permission('messages.read'));

drop policy moderation_logs_select on public.moderation_logs;
create policy moderation_logs_select on public.moderation_logs for select to authenticated using (private.has_permission('audit.view'));

drop policy gpcpsn_event_banners_admin on storage.objects;
drop policy gpcpsn_admin_select_images on storage.objects;
drop policy gpcpsn_admin_delete_images on storage.objects;
create policy gpcpsn_event_banners_admin on storage.objects for all to authenticated
using (bucket_id = 'event-banners' and private.has_permission('events.manage'))
with check (bucket_id = 'event-banners' and private.has_permission('events.manage')
            and name ~* '^events/[A-Za-z0-9._-]{1,100}\.(jpg|jpeg|png|webp)$');
create policy gpcpsn_admin_select_images on storage.objects for select to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and private.has_permission('members.review'));
create policy gpcpsn_admin_delete_images on storage.objects for delete to authenticated
using (bucket_id in ('avatars', 'covers', 'job-logos', 'article-images') and private.has_permission('members.review'));

-- ---------------------------------------------------------------- public functions
create or replace function public.get_event_online_url(p_event_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select e.online_url from public.events e
  where e.id = p_event_id and e.status = 'published'
    and (private.has_permission('events.manage') or exists (select 1 from public.event_registrations r
         where r.event_id = e.id and r.user_id = auth.uid() and r.status = 'registered'))
$$;

create or replace function public.admin_list_members(p_status text default null)
returns table (id uuid, full_name text, email text, graduation_year smallint, enrollment_no text, current_company text,
               city text, verification_status text, verification_note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('members.review') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.graduation_year, p.enrollment_no, p.current_company,
           p.city, p.verification_status, p.verification_note, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p_status is null or p.verification_status = p_status
    order by p.created_at desc
    limit 500;
end $$;

-- What the signed-in person may do (the website uses this to decide which panel sections to show; the database re-checks everything).
create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'superadmin', private.is_superadmin(),
    'roles', coalesce((select jsonb_agg(r.name order by r.name) from public.user_roles ur join public.roles r on r.key = ur.role_key where ur.user_id = auth.uid()), '[]'::jsonb),
    'permissions', case when private.is_superadmin()
        then coalesce((select jsonb_agg(p.key order by p.sort_order) from public.permissions p), '[]'::jsonb)
        else coalesce((select jsonb_agg(distinct rp.permission) from public.user_roles ur join public.role_permissions rp on rp.role_key = ur.role_key where ur.user_id = auth.uid()), '[]'::jsonb) end)
$$;

create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('dashboard.view') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'members_pending',  (select count(*) from public.profiles where verification_status = 'pending'),
    'members_verified', (select count(*) from public.profiles where verification_status = 'verified'),
    'jobs_pending',     (select count(*) from public.jobs where status = 'pending'),
    'jobs_live',        (select count(*) from public.jobs_public),
    'reports_open',     (select count(*) from public.content_reports where status = 'open'),
    'messages_new',     (select count(*) from public.contact_messages where not handled),
    'events_upcoming',  (select count(*) from public.events where status = 'published' and starts_at >= now()),
    'articles_pending', (select count(*) from public.articles where status = 'pending'));
end $$;

create or replace function public.admin_recent_activity(p_limit int default 15)
returns table (created_at timestamptz, entity_type text, entity_id uuid, action text, note text, actor_name text, entity_label text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('dashboard.view') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_limit > 20 and not private.has_permission('audit.view') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select l.created_at, l.entity_type, l.entity_id, l.action, l.note, coalesce(ap.full_name, 'System'),
           case l.entity_type
             when 'job' then (select j.title from public.jobs j where j.id = l.entity_id)
             when 'article' then (select a.title from public.articles a where a.id = l.entity_id)
             when 'event' then (select e.title from public.events e where e.id = l.entity_id)
             when 'profile' then (select p.full_name from public.profiles p where p.id = l.entity_id)
             when 'role' then (select p.full_name from public.profiles p where p.id = l.entity_id)
           end
    from public.moderation_logs l left join public.profiles ap on ap.id = l.actor_id
    order by l.id desc limit least(greatest(p_limit, 1), 200);
end $$;

-- ---------------------------------------------------------------- staff and role management (roles.manage only)
create or replace function public.admin_list_staff()
returns table (user_id uuid, email text, full_name text, roles jsonb)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return query
    select u.id, u.email::text, p.full_name, jsonb_agg(ur.role_key order by ur.role_key)
    from public.user_roles ur join auth.users u on u.id = ur.user_id left join public.profiles p on p.id = u.id
    group by u.id, u.email, p.full_name order by p.full_name nulls last, u.email;
end $$;

create or replace function public.admin_assign_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_role = 'superadmin' and not private.is_superadmin() then raise exception 'only_superadmin' using errcode = '42501'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email));
  if uid is null then raise exception 'user_not_found' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.roles where key = p_role) then raise exception 'role_not_found' using errcode = 'P0002'; end if;
  insert into public.user_roles (user_id, role_key, granted_by) values (uid, p_role, auth.uid()) on conflict do nothing;
  insert into public.moderation_logs (entity_type, entity_id, action, note, actor_id) values ('role', uid, 'granted: ' || p_role, null, auth.uid());
end $$;

create or replace function public.admin_remove_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_role = 'superadmin' then
    if not private.is_superadmin() then raise exception 'only_superadmin' using errcode = '42501'; end if;
    if (select count(*) from public.user_roles where role_key = 'superadmin') <= 1 then raise exception 'last_superadmin' using errcode = 'P0001'; end if;
  end if;
  delete from public.user_roles where user_id = p_user and role_key = p_role;
  insert into public.moderation_logs (entity_type, entity_id, action, note, actor_id) values ('role', p_user, 'removed: ' || p_role, null, auth.uid());
end $$;

create or replace function public.admin_roles() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'permissions', (select coalesce(jsonb_agg(jsonb_build_object('key', p.key, 'label', p.label, 'group', p.grp, 'description', p.description) order by p.sort_order), '[]'::jsonb) from public.permissions p),
    'roles', (select coalesce(jsonb_agg(jsonb_build_object(
        'key', r.key, 'name', r.name, 'description', r.description, 'is_system', r.is_system,
        'users', (select count(*) from public.user_roles ur where ur.role_key = r.key),
        'permissions', case when r.key = 'superadmin' then (select jsonb_agg(p.key) from public.permissions p)
                            else coalesce((select jsonb_agg(rp.permission order by rp.permission) from public.role_permissions rp where rp.role_key = r.key), '[]'::jsonb) end)
      order by r.is_system desc, r.name), '[]'::jsonb) from public.roles r));
end $$;

create or replace function public.admin_save_role(p_key text, p_name text, p_description text, p_permissions text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if p_key = 'superadmin' then raise exception 'locked_role' using errcode = '42501'; end if;
  if exists (select 1 from unnest(coalesce(p_permissions, '{}')) x where x not in (select key from public.permissions)) then
    raise exception 'unknown_permission' using errcode = '22023';
  end if;
  insert into public.roles (key, name, description) values (p_key, btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''))
  on conflict (key) do update set name = excluded.name, description = excluded.description;
  delete from public.role_permissions where role_key = p_key;
  insert into public.role_permissions (role_key, permission) select p_key, x from (select distinct unnest(coalesce(p_permissions, '{}')) x) q;
end $$;

create or replace function public.admin_delete_role(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_permission('roles.manage') then raise exception 'not_allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.roles where key = p_key and is_system) then raise exception 'locked_role' using errcode = '42501'; end if;
  if exists (select 1 from public.user_roles where role_key = p_key) then raise exception 'role_in_use' using errcode = 'P0001'; end if;
  delete from public.roles where key = p_key;
end $$;

revoke all on function public.get_event_online_url(uuid), public.admin_list_members(text), public.my_access(), public.admin_dashboard(),
  public.admin_recent_activity(int), public.admin_list_staff(), public.admin_assign_role(text, text), public.admin_remove_role(uuid, text),
  public.admin_roles(), public.admin_save_role(text, text, text, text[]), public.admin_delete_role(text) from public, anon;
grant execute on function public.get_event_online_url(uuid), public.admin_list_members(text), public.my_access(), public.admin_dashboard(),
  public.admin_recent_activity(int), public.admin_list_staff(), public.admin_assign_role(text, text), public.admin_remove_role(uuid, text),
  public.admin_roles(), public.admin_save_role(text, text, text, text[]), public.admin_delete_role(text) to authenticated;

-- ---------------------------------------------------------------- retire the old single-admin switch
-- These two statements fail loudly if any policy or object still depends on them, so nothing can be left on the old check.
drop function private.is_admin();
drop table public.app_admins;
