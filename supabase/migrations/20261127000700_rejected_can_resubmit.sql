-- GPCPSN Alumni Network | 7 - a rejected member who corrects the details that are checked (batch year, department,
-- enrolment number) goes back to "pending" so an administrator reviews them again. Members still cannot set their own status.
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
