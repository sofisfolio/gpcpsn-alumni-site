-- Make YOURSELF the first Superadmin. Run ONCE, in Supabase dashboard > SQL Editor.
-- Steps: 1) sign up on the live site with your email  2) replace the email below (both places)  3) press Run.
-- A Superadmin cannot be created from the website on purpose: only the project owner can do this here.
-- After this, you give roles to other people (faculty, admins, custom roles) from the website: Staff panel > Staff & roles.
insert into public.user_roles (user_id, role_key)
select id, 'superadmin' from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL'
on conflict do nothing;

update public.profiles set verification_status = 'verified'
where id = (select id from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL');

-- check: should return one row showing your email and 'superadmin'
select u.email, r.role_key, r.created_at from public.user_roles r join auth.users u on u.id = r.user_id;
