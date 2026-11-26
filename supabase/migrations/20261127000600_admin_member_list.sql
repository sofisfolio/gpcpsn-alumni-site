-- GPCPSN Alumni Network | 6 - admin member list.
-- Administrators need to see each applicant's sign-up email to verify them. Emails live in auth.users, which the API
-- cannot read, so this admin-only function returns them. Non-admins get an error, anonymous visitors cannot call it.
create or replace function public.admin_list_members(p_status text default null)
returns table (id uuid, full_name text, email text, graduation_year smallint, enrollment_no text, current_company text,
               city text, verification_status text, verification_note text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.graduation_year, p.enrollment_no, p.current_company,
           p.city, p.verification_status, p.verification_note, p.created_at
    from public.profiles p join auth.users u on u.id = p.id
    where p_status is null or p.verification_status = p_status
    order by p.created_at desc
    limit 500;
end $$;
revoke all on function public.admin_list_members(text) from public, anon;
grant execute on function public.admin_list_members(text) to authenticated;
