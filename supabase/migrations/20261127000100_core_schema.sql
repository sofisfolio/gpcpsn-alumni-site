-- GPCPSN Alumni Network | 1/4 core schema
-- Tables, constraints, indexes, helper functions and triggers.
-- Row Level Security, grants and views are in 20261127000200_security.sql.
-- Run order matters. Safe to read top to bottom; do not edit after applying: add a new migration instead.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------- helpers
create or replace function private.slugify(t text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g'), '-')
$$;

-- ---------------------------------------------------------------- reference data tables
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 100),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  sort_order int not null default 0
);

create table public.article_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  sort_order int not null default 0
);

-- ---------------------------------------------------------------- administrators
-- Rows are added ONLY by the owner running SQL in the Supabase dashboard (see docs/admin-bootstrap.sql).
-- No API role can insert, update or delete here.
create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins a where a.user_id = auth.uid())
$$;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  graduation_year smallint check (graduation_year between 1950 and 2100),
  department_id uuid references public.departments (id) on delete restrict,
  enrollment_no text check (char_length(enrollment_no) <= 40),             -- private: admin verification only
  headline text check (char_length(headline) <= 160),
  current_company text check (char_length(current_company) <= 120),
  current_position text check (char_length(current_position) <= 120),
  city text check (char_length(city) <= 80),
  country text check (char_length(country) <= 80),
  industry text check (char_length(industry) <= 80),
  bio text check (char_length(bio) <= 2000),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  achievements text[] not null default '{}' check (cardinality(achievements) <= 20),
  website_url text check (website_url is null or website_url ~* '^https://[^[:space:]<>"'']{3,255}$'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/[^[:space:]<>"'']{1,255}$'),
  avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  cover_path text check (cover_path is null or cover_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'members', 'public')),
  contact_visibility text not null default 'hidden' check (contact_visibility in ('hidden', 'members')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected', 'suspended')),
  verification_note text check (char_length(verification_note) <= 500),   -- admin feedback, visible to the owner
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_grad_year_idx on public.profiles (graduation_year);
create index profiles_department_idx on public.profiles (department_id);
create index profiles_visibility_idx on public.profiles (verification_status, profile_visibility);
create index profiles_name_idx on public.profiles (lower(full_name));

create or replace function private.is_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.verification_status = 'verified')
$$;

-- Private contact details, never exposed publicly.
create table public.profile_contact (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  contact_email text check (contact_email is null or (char_length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  phone text check (phone is null or phone ~ '^[0-9+() -]{6,20}$')
);

create table public.profile_experience (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  organisation text not null check (char_length(organisation) between 2 and 120),
  start_year smallint check (start_year between 1950 and 2100),
  end_year smallint check (end_year between 1950 and 2100),                -- null = current
  description text check (char_length(description) <= 500),
  sort_order int not null default 0,
  check (end_year is null or start_year is null or end_year >= start_year)
);
create index profile_experience_profile_idx on public.profile_experience (profile_id);

create table public.profile_education (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  qualification text not null check (char_length(qualification) between 2 and 120),
  institution text not null check (char_length(institution) between 2 and 120),
  year smallint check (year between 1950 and 2100),
  sort_order int not null default 0
);
create index profile_education_profile_idx on public.profile_education (profile_id);

create or replace function private.can_view_profile(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select pid = auth.uid()
      or private.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = pid and p.verification_status = 'verified'
          and (p.profile_visibility = 'public' or (p.profile_visibility = 'members' and auth.uid() is not null))
      )
$$;

-- ---------------------------------------------------------------- jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  company text not null check (char_length(company) between 2 and 120),
  company_website text check (company_website is null or company_website ~* '^https://[^[:space:]<>"'']{3,255}$'),
  company_logo_path text check (company_logo_path is null or company_logo_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  location text not null check (char_length(location) between 2 and 120),
  work_mode text not null default 'on_site' check (work_mode in ('on_site', 'hybrid', 'remote')),
  employment_type text not null default 'full_time' check (employment_type in ('full_time', 'part_time', 'contract', 'internship', 'apprenticeship')),
  industry text check (char_length(industry) <= 80),
  experience_min_years smallint check (experience_min_years between 0 and 60),
  experience_max_years smallint check (experience_max_years between 0 and 60),
  salary_text text check (char_length(salary_text) <= 60),
  description text not null check (char_length(description) between 20 and 8000),
  responsibilities text check (char_length(responsibilities) <= 4000),
  qualifications text check (char_length(qualifications) <= 4000),
  skills text[] not null default '{}' check (cardinality(skills) <= 20),
  apply_url text check (apply_url is null or apply_url ~* '^https://[^[:space:]<>"'']{3,255}$'),
  apply_email text check (apply_email is null or (char_length(apply_email) <= 254 and apply_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  deadline date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'withdrawn')),
  rejection_reason text check (char_length(rejection_reason) <= 500),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (apply_url is not null or apply_email is not null),
  check (experience_max_years is null or experience_min_years is null or experience_max_years >= experience_min_years)
);
create index jobs_status_published_idx on public.jobs (status, published_at desc);
create index jobs_submitter_idx on public.jobs (submitted_by);
create index jobs_deadline_idx on public.jobs (deadline);

-- ---------------------------------------------------------------- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 150),
  description text check (char_length(description) <= 8000),
  banner_path text check (banner_path is null or banner_path ~ '^events/[A-Za-z0-9._-]{1,100}$'),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Asia/Kolkata',
  venue text check (char_length(venue) <= 150),
  address text check (char_length(address) <= 300),
  is_online boolean not null default false,
  online_url text check (online_url is null or online_url ~* '^https://[^[:space:]<>"'']{3,255}$'),  -- private: registrants only
  category_id uuid references public.event_categories (id) on delete set null,
  capacity int check (capacity is null or capacity > 0),
  registration_deadline timestamptz,
  fee_text text not null default 'Free' check (char_length(fee_text) <= 60),
  organizer text check (char_length(organizer) <= 150),
  agenda jsonb not null default '[]' check (jsonb_typeof(agenda) = 'array'),
  speakers jsonb not null default '[]' check (jsonb_typeof(speakers) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  featured boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_status_start_idx on public.events (status, starts_at);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled')),
  attendees smallint not null default 1 check (attendees between 1 and 4),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  unique (event_id, user_id)
);
create index event_registrations_user_idx on public.event_registrations (user_id);
create index event_registrations_event_idx on public.event_registrations (event_id, status);

-- ---------------------------------------------------------------- articles
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 200),
  category_id uuid references public.article_categories (id) on delete set null,
  summary text check (char_length(summary) <= 400),
  cover_path text check (cover_path is null or cover_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,100}$'),
  content text not null default '' check (char_length(content) <= 50000),   -- plain text / restricted Markdown; ALWAYS escaped on render
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'archived')),
  rejection_reason text check (char_length(rejection_reason) <= 500),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_status_published_idx on public.articles (status, published_at desc);
create index articles_author_idx on public.articles (author_id);

-- ---------------------------------------------------------------- site content, moderation, misc
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('job', 'article')),
  entity_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, entity_type, entity_id)
);
create index content_reports_entity_idx on public.content_reports (entity_type, entity_id);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(quote) between 10 and 500),
  author_name text not null check (char_length(author_name) between 2 and 120),
  batch_year smallint check (batch_year between 1950 and 2100),
  role_text text check (char_length(role_text) <= 120),
  is_approved boolean not null default false,                               -- only genuine, approved quotes are shown
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.featured_alumni (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z0-9_.-]{1,60}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  message text not null check (char_length(message) between 10 and 3000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.moderation_logs (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,                                                      -- the new status
  note text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index moderation_logs_entity_idx on public.moderation_logs (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------- triggers
-- New auth user -> profile row. Only reads name / year / department from sign-up metadata; everything
-- else (verification, visibility, roles) is fixed by defaults, so a hostile sign-up cannot choose them.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  yr int; dep uuid; nm text;
begin
  nm := left(btrim(coalesce(m ->> 'full_name', '')), 120);
  begin yr := (m ->> 'graduation_year')::int; exception when others then yr := null; end;
  if yr is not null and (yr < 1950 or yr > 2100) then yr := null; end if;
  select d.id into dep from public.departments d where d.slug = m ->> 'department' and d.is_active limit 1;
  insert into public.profiles (id, full_name, graduation_year, department_id)
  values (new.id, nm, yr, dep)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Members cannot change their own verification, and re-verification is required if identity fields change.
create or replace function private.guard_profiles() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    if new.id is distinct from old.id then
      raise exception 'profile id is immutable' using errcode = '42501';
    end if;
    if new.verification_status is distinct from old.verification_status
       or new.verification_note is distinct from old.verification_note then
      raise exception 'verification fields can only be changed by an administrator' using errcode = '42501';
    end if;
    if old.verification_status = 'verified'
       and (new.graduation_year is distinct from old.graduation_year
         or new.department_id is distinct from old.department_id
         or new.enrollment_no is distinct from old.enrollment_no) then
      new.verification_status := 'pending';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function private.guard_profiles();

-- Jobs: members can only create/edit pending listings; approval is admin-only.
create or replace function private.guard_jobs() returns trigger
language plpgsql set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if actor is not null and not private.is_admin() then
      new.status := 'pending'; new.published_at := null; new.rejection_reason := null;
      new.featured := false; new.submitted_by := actor;
    end if;
    return new;
  end if;
  if actor is not null and not private.is_admin() then
    new.submitted_by := old.submitted_by;
    new.featured := old.featured;
    if new.status = 'withdrawn' then
      new.published_at := old.published_at; new.rejection_reason := old.rejection_reason;
    else                                   -- any edit sends the listing back for review
      new.status := 'pending'; new.published_at := null; new.rejection_reason := null;
    end if;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger jobs_guard before insert or update on public.jobs
  for each row execute function private.guard_jobs();

-- Articles: members can only save drafts or submit for review; publishing is admin-only.
create or replace function private.guard_articles() returns trigger
language plpgsql set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.slug is null or new.slug = '' then
      new.slug := coalesce(nullif(private.slugify(new.title), ''), 'article') || '-' || substr(new.id::text, 1, 8);
    end if;
    if actor is not null and not private.is_admin() then
      if new.status not in ('draft', 'pending') then new.status := 'draft'; end if;
      new.featured := false; new.published_at := null; new.rejection_reason := null; new.author_id := actor;
    end if;
    return new;
  end if;
  if actor is not null and not private.is_admin() then
    new.author_id := old.author_id; new.featured := old.featured;
    new.published_at := old.published_at; new.slug := old.slug;
    new.rejection_reason := case when new.status = 'pending' then null else old.rejection_reason end;
  elsif new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger articles_guard before insert or update on public.articles
  for each row execute function private.guard_articles();

create or replace function private.guard_events() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (new.slug is null or new.slug = '') then
    new.slug := coalesce(nullif(private.slugify(new.title), ''), 'event') || '-' || substr(new.id::text, 1, 8);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger events_guard before insert or update on public.events
  for each row execute function private.guard_events();

-- Audit trail of status changes (who changed what to what).
create or replace function private.log_status_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  col text := tg_argv[1];
  n jsonb := to_jsonb(new);
  o jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
begin
  if tg_op = 'INSERT' or (n ->> col) is distinct from (o ->> col) then
    insert into public.moderation_logs (entity_type, entity_id, action, note, actor_id)
    values (tg_argv[0], new.id, n ->> col, coalesce(n ->> 'rejection_reason', n ->> 'verification_note'), auth.uid());
  end if;
  return null;
end $$;
create trigger jobs_log after insert or update on public.jobs for each row execute function private.log_status_change('job', 'status');
create trigger articles_log after insert or update on public.articles for each row execute function private.log_status_change('article', 'status');
create trigger events_log after insert or update on public.events for each row execute function private.log_status_change('event', 'status');
create trigger profiles_log after insert or update on public.profiles for each row execute function private.log_status_change('profile', 'verification_status');
