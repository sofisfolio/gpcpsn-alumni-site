-- Make YOURSELF the first administrator. Run ONCE, in Supabase dashboard > SQL Editor.
-- Steps: 1) sign up on the live site with your email  2) replace the email below  3) press Run.
-- Admins cannot be created from the website on purpose: only the project owner can do this here.
insert into public.app_admins (user_id, note)
select id, 'first administrator' from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL'
on conflict do nothing;

update public.profiles set verification_status = 'verified'
where id = (select id from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL');

-- check: should return one row
select u.email, a.created_at from public.app_admins a join auth.users u on u.id = a.user_id;
