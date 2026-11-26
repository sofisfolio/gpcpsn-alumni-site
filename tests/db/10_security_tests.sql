-- Attack-and-behaviour tests for the database. Each call runs one statement as a given user/role and compares
-- the outcome with what we expect. Expectations: 'ok' (>=1 row changed), 'rows0' (silently denied by RLS),
-- 'count:N' (select returns N rows) or 'error:<text>' (must fail with a message containing <text>).
create schema t;
create table t.results (n serial, label text, ok boolean, outcome text);

create function t.exec(p_label text, p_uid uuid, p_role text, p_sql text, p_expect text) returns void
language plpgsql as $$
declare n bigint; outcome text; good boolean;
begin
  begin
    perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
    execute format('set local role %I', p_role);
    if p_expect like 'count:%' then
      execute 'select count(*) from (' || p_sql || ') q' into n;
      outcome := 'count:' || n;
    else
      execute p_sql;
      get diagnostics n = row_count;
      outcome := case when n = 0 then 'rows0' else 'ok' end;
    end if;
    reset role;
  exception when others then
    reset role;
    outcome := 'error:' || sqlerrm;
  end;
  if p_expect like 'error%' then
    good := outcome like 'error:%' and position(substr(p_expect, 7) in outcome) > 0;
  else
    good := outcome = p_expect;
  end if;
  insert into t.results (label, ok, outcome) values (p_label, good, outcome);
end $$;

\set A  '''a0000000-0000-0000-0000-000000000001'''
\set B  '''a0000000-0000-0000-0000-000000000002'''
\set C  '''a0000000-0000-0000-0000-000000000003'''
\set AD '''a0000000-0000-0000-0000-000000000004'''
\set AA '''a0000000-0000-0000-0000-000000000005'''
\set F  '''a0000000-0000-0000-0000-000000000006'''

-- ------------------------------------------------------------------ fixtures (as superuser, like the SQL editor)
insert into auth.users (id, email, raw_user_meta_data) values
 (:A,  'alice@example.test', '{"full_name":"Alice Alumna","graduation_year":2014,"department":"civil-engineering"}'),
 (:B,  'bob@example.test',   '{"full_name":"Bob Pending","graduation_year":2016,"department":"civil-engineering","verification_status":"verified","is_admin":true,"role":"admin"}'),
 (:C,  'carol@example.test', '{"full_name":"Carol Member","graduation_year":2018,"department":"civil-engineering"}'),
 (:AD, 'admin@example.test', '{"full_name":"Admin Person","graduation_year":2010,"department":"civil-engineering"}'),
 (:AA, 'admin2@example.test', '{"full_name":"Plain Admin","graduation_year":2011,"department":"civil-engineering"}'),
 (:F,  'faculty@example.test', '{"full_name":"Faculty Person","graduation_year":2005,"department":"civil-engineering"}');
update public.profiles set verification_status = 'verified' where id in (:A, :C, :AD);
update public.profiles set profile_visibility = 'public', contact_visibility = 'members' where id = :A;
update public.profiles set profile_visibility = 'members' where id = :C;
insert into public.user_roles (user_id, role_key) values (:AD, 'superadmin'), (:AA, 'admin'), (:F, 'faculty');
insert into public.profile_contact (profile_id, contact_email) values (:A, 'alice.private@example.test');

select t.exec('trigger created a profile for every sign-up', null, 'postgres', $q$select 1 from public.profiles$q$, 'count:6');
select t.exec('hostile sign-up metadata cannot make Bob verified', null, 'postgres', $q$select 1 from public.profiles where id='a0000000-0000-0000-0000-000000000002' and verification_status='pending'$q$, 'count:1');
select t.exec('hostile sign-up metadata cannot make Bob an admin', null, 'postgres', $q$select 1 from public.user_roles where user_id='a0000000-0000-0000-0000-000000000002'$q$, 'count:0');

-- ------------------------------------------------------------------ structural checks
select t.exec('RLS enabled on every public table', null, 'postgres',
  $q$select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity$q$, 'count:0');
select t.exec('anon holds no unexpected privilege on any public table/view', null, 'postgres',
  $q$select 1 from information_schema.table_privileges where grantee='anon' and table_schema='public'
     and table_name not in ('departments','event_categories','article_categories','testimonials','site_settings','profile_experience','profile_education','contact_messages',
                            'directory_profiles','jobs_public','events_public','articles_public','featured_alumni_public','site_stats')$q$, 'count:0');
select t.exec('anon may only INSERT (not read) contact_messages', null, 'postgres',
  $q$select 1 from information_schema.table_privileges where grantee='anon' and table_name='contact_messages' and privilege_type<>'INSERT'$q$, 'count:0');
select t.exec('directory view exposes no private columns', null, 'postgres',
  $q$select 1 from information_schema.columns where table_schema='public' and table_name in ('directory_profiles','featured_alumni_public','jobs_public','events_public','articles_public')
     and column_name in ('enrollment_no','verification_status','verification_note','contact_email','phone','online_url','submitted_by','rejection_reason','created_by')$q$, 'count:0');

-- ------------------------------------------------------------------ privacy of profiles / directory
select t.exec('anon cannot read the profiles table', null, 'anon', $q$select * from public.profiles$q$, 'error:permission denied');
select t.exec('anon sees only verified+public profiles (1)', null, 'anon', $q$select * from public.directory_profiles$q$, 'count:1');
select t.exec('signed-in member sees public + members profiles (Alice, Carol)', :B, 'authenticated', $q$select * from public.directory_profiles$q$, 'count:2');
select t.exec('pending/private profile (Bob) is not listed', :C, 'authenticated', $q$select * from public.directory_profiles where full_name='Bob Pending'$q$, 'count:0');
select t.exec('member cannot read another member profile row directly', :C, 'authenticated', $q$select * from public.profiles where id='a0000000-0000-0000-0000-000000000001'$q$, 'count:0');
select t.exec('member can read their own profile row', :C, 'authenticated', $q$select * from public.profiles where id='a0000000-0000-0000-0000-000000000003'$q$, 'count:1');
select t.exec('anon cannot read private contact details view', null, 'anon', $q$select * from public.directory_contact$q$, 'error:permission denied');
select t.exec('member sees contact only when owner opted in (Alice yes)', :C, 'authenticated', $q$select * from public.directory_contact$q$, 'count:1');
select t.exec('member cannot read contact table of others', :C, 'authenticated', $q$select * from public.profile_contact$q$, 'count:0');
select t.exec('owner reads own contact row', :A, 'authenticated', $q$select * from public.profile_contact$q$, 'count:1');
select t.exec('profile cannot be deleted through the API', :A, 'authenticated', $q$delete from public.profiles where id='a0000000-0000-0000-0000-000000000001'$q$, 'error:permission denied');

-- ------------------------------------------------------------------ privilege escalation
select t.exec('member cannot self-verify', :B, 'authenticated', $q$update public.profiles set verification_status='verified' where id='a0000000-0000-0000-0000-000000000002'$q$, 'error:administrator');
select t.exec('member cannot change verification note', :B, 'authenticated', $q$update public.profiles set verification_note='trust me' where id='a0000000-0000-0000-0000-000000000002'$q$, 'error:administrator');
select t.exec('member can edit own bio', :B, 'authenticated', $q$update public.profiles set bio='Hello' where id='a0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t.exec('member cannot edit someone else', :B, 'authenticated', $q$update public.profiles set bio='hacked' where id='a0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('member cannot change profile id', :B, 'authenticated', $q$update public.profiles set id=gen_random_uuid() where id='a0000000-0000-0000-0000-000000000002'$q$, 'error:');
select t.exec('member cannot grant themselves a role', :B, 'authenticated', $q$insert into public.user_roles(user_id, role_key) values ('a0000000-0000-0000-0000-000000000002','superadmin')$q$, 'error:permission denied');
select t.exec('member cannot read roles', :B, 'authenticated', $q$select * from public.user_roles$q$, 'error:permission denied');
select t.exec('member cannot edit role permissions', :B, 'authenticated', $q$insert into public.role_permissions values ('faculty','roles.manage')$q$, 'error:permission denied');
select t.exec('anon cannot read roles', null, 'anon', $q$select * from public.user_roles$q$, 'error:permission denied');
select t.exec('changing graduation year drops verification (re-check needed)', :A, 'authenticated', $q$update public.profiles set graduation_year=2015 where id='a0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('  ...Alice is now pending again', null, 'postgres', $q$select 1 from public.profiles where id='a0000000-0000-0000-0000-000000000001' and verification_status='pending'$q$, 'count:1');
update public.profiles set verification_status = 'verified' where id = :A;

-- ------------------------------------------------------------------ jobs
select t.exec('unverified member cannot post a job', :B, 'authenticated',
  $q$insert into public.jobs(submitted_by,title,company,location,description,apply_url) values ('a0000000-0000-0000-0000-000000000002','Site Engineer','Acme','Pune','A long enough description here','https://acme.test/apply')$q$, 'error:row-level security');
select t.exec('verified member posts job (tries to force approved+featured)', :A, 'authenticated',
  $q$insert into public.jobs(id,submitted_by,title,company,location,description,apply_url,apply_email,status,featured) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','Site Engineer','Acme','Pune','A long enough description here','https://acme.test/apply','hr@acme.test','approved',true)$q$, 'ok');
select t.exec('  ...server forced status=pending, featured=false', null, 'postgres', $q$select 1 from public.jobs where id='b0000000-0000-0000-0000-000000000001' and status='pending' and not featured$q$, 'count:1');
select t.exec('pending job is invisible to the public', null, 'anon', $q$select * from public.jobs_public$q$, 'count:0');
select t.exec('anon cannot read jobs table', null, 'anon', $q$select * from public.jobs$q$, 'error:permission denied');
select t.exec('another member cannot see a pending job', :C, 'authenticated', $q$select * from public.jobs$q$, 'count:0');
select t.exec('another member cannot edit the job', :C, 'authenticated', $q$update public.jobs set title='x' where id='b0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('another member cannot delete the job', :C, 'authenticated', $q$delete from public.jobs where id='b0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('owner cannot self-approve (update accepted, status stays pending)', :A, 'authenticated', $q$update public.jobs set status='approved' where id='b0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('  ...still pending', null, 'postgres', $q$select 1 from public.jobs where id='b0000000-0000-0000-0000-000000000001' and status='pending' and published_at is null$q$, 'count:1');
select t.exec('javascript: links rejected', :A, 'authenticated', $q$update public.jobs set apply_url='javascript:alert(1)' where id='b0000000-0000-0000-0000-000000000001'$q$, 'error:check constraint');
select t.exec('plain http links rejected', :A, 'authenticated', $q$update public.jobs set apply_url='http://acme.test' where id='b0000000-0000-0000-0000-000000000001'$q$, 'error:check constraint');
select t.exec('job needs an application method', :A, 'authenticated',
  $q$insert into public.jobs(submitted_by,title,company,location,description) values ('a0000000-0000-0000-0000-000000000001','No Apply','Acme','Pune','A long enough description here')$q$, 'error:check constraint');
select t.exec('admin approves job', :AD, 'authenticated', $q$update public.jobs set status='approved' where id='b0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('approved job is public', null, 'anon', $q$select * from public.jobs_public$q$, 'count:1');
select t.exec('  ...published_at stamped by the server', null, 'postgres', $q$select 1 from public.jobs where id='b0000000-0000-0000-0000-000000000001' and published_at is not null$q$, 'count:1');
select t.exec('application email hidden from anonymous visitors', null, 'anon', $q$select * from public.jobs_public where apply_email is not null$q$, 'count:0');
select t.exec('application email shown to signed-in members', :C, 'authenticated', $q$select * from public.jobs_public where apply_email is not null$q$, 'count:1');
select t.exec('moderation log recorded the approval', null, 'postgres', $q$select 1 from public.moderation_logs where entity_type='job' and action='approved' and actor_id='a0000000-0000-0000-0000-000000000004'$q$, 'count:1');
select t.exec('members cannot read the moderation log', :A, 'authenticated', $q$select * from public.moderation_logs$q$, 'count:0');
select t.exec('owner edit sends approved job back to pending', :A, 'authenticated', $q$update public.jobs set title='Senior Site Engineer' where id='b0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('  ...no longer public', null, 'anon', $q$select * from public.jobs_public$q$, 'count:0');
update public.jobs set status = 'approved', deadline = current_date - 1 where id = 'b0000000-0000-0000-0000-000000000001';
select t.exec('expired job (deadline passed) is hidden', null, 'anon', $q$select * from public.jobs_public$q$, 'count:0');

-- ------------------------------------------------------------------ events and registration
select t.exec('member cannot create events', :A, 'authenticated',
  $q$insert into public.events(title,starts_at,status) values ('Fake event', now()+interval '10 days','published')$q$, 'error:row-level security');
select t.exec('admin creates events', :AD, 'authenticated', $q$
  insert into public.events(id,title,starts_at,status,capacity,is_online,online_url) values
   ('e0000000-0000-0000-0000-000000000001','Annual Meet', now()+interval '30 days','published',2,true,'https://meet.example.test/secret'),
   ('e0000000-0000-0000-0000-000000000002','Draft Event', now()+interval '40 days','draft',null,false,null),
   ('e0000000-0000-0000-0000-000000000003','Past Event',  now()-interval '5 days','published',null,false,null)$q$, 'ok');
select t.exec('slug generated automatically', null, 'postgres', $q$select 1 from public.events where slug like 'annual-meet-%'$q$, 'count:1');
select t.exec('public sees published events only', null, 'anon', $q$select * from public.events_public$q$, 'count:2');
select t.exec('draft event hidden from public', null, 'anon', $q$select * from public.events_public where title='Draft Event'$q$, 'count:0');
select t.exec('anon cannot read events table (online link stays private)', null, 'anon', $q$select * from public.events$q$, 'error:permission denied');
select t.exec('anon cannot register', null, 'anon', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'error:permission denied');
select t.exec('pending member cannot register', :B, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'error:not_verified');
select t.exec('verified member registers', :A, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'ok');
select t.exec('duplicate registration blocked', :A, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'error:already_registered');
select t.exec('capacity enforced (1 taken + 2 > 2)', :C, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 2::smallint)$q$, 'error:event_full');
select t.exec('second member fills the last seat', :C, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'ok');
select t.exec('seat count visible publicly and correct (2)', null, 'anon', $q$select * from public.events_public where seats_taken=2$q$, 'count:1');
select t.exec('attendee count above 4 rejected', :AD, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 9::smallint)$q$, 'error:invalid_attendees');
select t.exec('cannot register for a draft event', :C, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000002'::uuid, 1::smallint)$q$, 'error:event_not_found');
select t.exec('cannot register for a past event', :C, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000003'::uuid, 1::smallint)$q$, 'error:registration_closed');
select t.exec('member cannot write registrations directly (insert)', :C, 'authenticated', $q$insert into public.event_registrations(event_id,user_id) values ('e0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000003')$q$, 'error:permission denied');
select t.exec('member cannot write registrations directly (update)', :C, 'authenticated', $q$update public.event_registrations set attendees=4$q$, 'error:permission denied');
select t.exec('member sees only own registrations', :C, 'authenticated', $q$select * from public.event_registrations$q$, 'count:1');
select t.exec('admin sees all registrations', :AD, 'authenticated', $q$select * from public.event_registrations$q$, 'count:2');
select t.exec('registered member can fetch online link', :C, 'authenticated', $q$select 1 where public.get_event_online_url('e0000000-0000-0000-0000-000000000001') is not null$q$, 'count:1');
select t.exec('non-registered member cannot fetch online link', :B, 'authenticated', $q$select 1 where public.get_event_online_url('e0000000-0000-0000-0000-000000000001') is not null$q$, 'count:0');
select t.exec('anon cannot call online-link function', null, 'anon', $q$select public.get_event_online_url('e0000000-0000-0000-0000-000000000001')$q$, 'error:permission denied');
select t.exec('member cancels registration', :A, 'authenticated', $q$select 1 where public.cancel_event_registration('e0000000-0000-0000-0000-000000000001')$q$, 'count:1');
select t.exec('  ...seat freed (1 taken)', null, 'anon', $q$select * from public.events_public where seats_taken=1$q$, 'count:1');
select t.exec('  ...cancelled member loses online link', :A, 'authenticated', $q$select 1 where public.get_event_online_url('e0000000-0000-0000-0000-000000000001') is not null$q$, 'count:0');
select t.exec('member can re-register after cancelling', :A, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'ok');

-- ------------------------------------------------------------------ articles
select t.exec('unverified member cannot write articles', :B, 'authenticated', $q$insert into public.articles(author_id,title) values ('a0000000-0000-0000-0000-000000000002','Hello world')$q$, 'error:row-level security');
select t.exec('member tries to publish own article directly', :A, 'authenticated',
  $q$insert into public.articles(id,author_id,title,content,status,featured) values ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','My first article','<script>alert(1)</script> text','published',true)$q$, 'ok');
select t.exec('  ...server forced draft and not featured', null, 'postgres', $q$select 1 from public.articles where id='c0000000-0000-0000-0000-000000000001' and status='draft' and not featured and published_at is null$q$, 'count:1');
select t.exec('  ...slug auto-generated', null, 'postgres', $q$select 1 from public.articles where id='c0000000-0000-0000-0000-000000000001' and slug like 'my-first-article-%'$q$, 'count:1');
select t.exec('draft invisible to public', null, 'anon', $q$select * from public.articles_public$q$, 'count:0');
select t.exec('other members cannot read the draft', :C, 'authenticated', $q$select * from public.articles$q$, 'count:0');
select t.exec('author submits draft for review', :A, 'authenticated', $q$update public.articles set status='pending' where id='c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('author cannot edit while pending', :A, 'authenticated', $q$update public.articles set title='Changed' where id='c0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('author cannot publish by update', :A, 'authenticated', $q$update public.articles set status='published' where id='c0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('admin rejects with feedback', :AD, 'authenticated', $q$update public.articles set status='rejected', rejection_reason='Please add sources' where id='c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('author can read the feedback', :A, 'authenticated', $q$select 1 from public.articles where rejection_reason='Please add sources'$q$, 'count:1');
select t.exec('author edits rejected article and resubmits (feedback cleared)', :A, 'authenticated', $q$update public.articles set content='More text', status='pending' where id='c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('admin publishes', :AD, 'authenticated', $q$update public.articles set status='published' where id='c0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('published article is public with author name', null, 'anon', $q$select * from public.articles_public where author_name='Alice Alumna'$q$, 'count:1');
select t.exec('anon cannot read articles table', null, 'anon', $q$select * from public.articles$q$, 'error:permission denied');
select t.exec('author cannot edit a published article', :A, 'authenticated', $q$update public.articles set content='silent change' where id='c0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('author cannot delete a published article', :A, 'authenticated', $q$delete from public.articles where id='c0000000-0000-0000-0000-000000000001'$q$, 'rows0');


-- ------------------------------------------------------------------ rejected members can resubmit
update public.profiles set verification_status = 'rejected', verification_note = 'enrolment number not found' where id = :B;
select t.exec('rejected member saving unrelated details stays rejected', :B, 'authenticated', $q$update public.profiles set bio='updated bio' where id='a0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t.exec('  ...still rejected', null, 'postgres', $q$select 1 from public.profiles where id='a0000000-0000-0000-0000-000000000002' and verification_status='rejected'$q$, 'count:1');
select t.exec('rejected member correcting enrolment goes back to pending', :B, 'authenticated', $q$update public.profiles set enrollment_no='CE-2016-09' where id='a0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t.exec('  ...now pending for review', null, 'postgres', $q$select 1 from public.profiles where id='a0000000-0000-0000-0000-000000000002' and verification_status='pending'$q$, 'count:1');
select t.exec('rejected member still cannot set status directly', :B, 'authenticated', $q$update public.profiles set verification_status='verified' where id='a0000000-0000-0000-0000-000000000002'$q$, 'error:administrator');


-- ------------------------------------------------------------------ reports, contact, site content
select t.exec('verified member reports a job', :C, 'authenticated', $q$insert into public.content_reports(reporter_id,entity_type,entity_id,reason) values ('a0000000-0000-0000-0000-000000000003','job','b0000000-0000-0000-0000-000000000001','Looks like a scam')$q$, 'ok');
select t.exec('duplicate report blocked', :C, 'authenticated', $q$insert into public.content_reports(reporter_id,entity_type,entity_id,reason) values ('a0000000-0000-0000-0000-000000000003','job','b0000000-0000-0000-0000-000000000001','Again')$q$, 'error:duplicate key');
select t.exec('cannot report as someone else', :C, 'authenticated', $q$insert into public.content_reports(reporter_id,entity_type,entity_id,reason) values ('a0000000-0000-0000-0000-000000000001','job','b0000000-0000-0000-0000-000000000001','Framing Alice')$q$, 'error:row-level security');
select t.exec('other members cannot read reports', :A, 'authenticated', $q$select * from public.content_reports$q$, 'count:0');
select t.exec('admin reads reports', :AD, 'authenticated', $q$select * from public.content_reports$q$, 'count:1');
select t.exec('visitor can submit contact message', null, 'anon', $q$insert into public.contact_messages(name,email,message) values ('Visitor','v@example.test','Hello, I have a question about joining.')$q$, 'ok');
select t.exec('visitor cannot read contact messages', null, 'anon', $q$select * from public.contact_messages$q$, 'error:permission denied');
select t.exec('visitor cannot pre-mark message as handled', null, 'anon', $q$insert into public.contact_messages(name,email,message,handled) values ('V','v@example.test','Hello, I have a question about joining.',true)$q$, 'error:row-level security');
select t.exec('too-short or invalid contact rejected', null, 'anon', $q$insert into public.contact_messages(name,email,message) values ('V','not-an-email','short')$q$, 'error:check constraint');
select t.exec('member cannot read contact messages', :A, 'authenticated', $q$select * from public.contact_messages$q$, 'count:0');
select t.exec('admin reads contact messages', :AD, 'authenticated', $q$select * from public.contact_messages$q$, 'count:1');
insert into public.testimonials (quote, author_name, is_approved) values ('Genuine approved quote text.', 'Real Person', true), ('Unapproved draft quote text.', 'Other Person', false);
select t.exec('only approved testimonials are public', null, 'anon', $q$select * from public.testimonials$q$, 'count:1');
select t.exec('anon cannot write testimonials', null, 'anon', $q$insert into public.testimonials(quote,author_name,is_approved) values ('Fake quote about us here','Fake',true)$q$, 'error:permission denied');
select t.exec('member cannot write testimonials', :A, 'authenticated', $q$insert into public.testimonials(quote,author_name,is_approved) values ('Fake quote about us here','Fake',true)$q$, 'error:row-level security');
select t.exec('member cannot change site settings', :A, 'authenticated', $q$insert into public.site_settings(key,value) values ('contact','{"email":"evil@x"}')$q$, 'error:row-level security');
select t.exec('admin changes site settings', :AD, 'authenticated', $q$insert into public.site_settings(key,value) values ('contact','{"email":"alumni@example.test"}')$q$, 'ok');
select t.exec('site settings readable by public', null, 'anon', $q$select * from public.site_settings$q$, 'count:1');
select t.exec('real site statistics come from the database (3 verified)', null, 'anon', $q$select 1 from public.site_stats where verified_members=3$q$, 'count:1');

-- ------------------------------------------------------------------ experience / education visibility
select t.exec('member adds own experience', :A, 'authenticated', $q$insert into public.profile_experience(profile_id,title,organisation) values ('a0000000-0000-0000-0000-000000000001','Site Engineer','Acme Infra')$q$, 'ok');
select t.exec('cannot add experience to another profile', :B, 'authenticated', $q$insert into public.profile_experience(profile_id,title,organisation) values ('a0000000-0000-0000-0000-000000000001','Fake','Fake Co')$q$, 'error:row-level security');
select t.exec('public profile experience visible to anon', null, 'anon', $q$select * from public.profile_experience$q$, 'count:1');
insert into public.profile_experience (profile_id, title, organisation) values (:C, 'Planner', 'City Council');
select t.exec('members-only profile experience hidden from anon', null, 'anon', $q$select * from public.profile_experience where profile_id='a0000000-0000-0000-0000-000000000003'$q$, 'count:0');
select t.exec('members-only profile experience visible to members', :B, 'authenticated', $q$select * from public.profile_experience where profile_id='a0000000-0000-0000-0000-000000000003'$q$, 'count:1');

-- ------------------------------------------------------------------ suspension
update public.profiles set verification_status = 'suspended' where id = :C;
select t.exec('suspended member disappears from directory', null, 'anon', $q$select * from public.directory_profiles where full_name='Carol Member'$q$, 'count:0');
select t.exec('suspended member cannot register', :C, 'authenticated', $q$select public.register_for_event('e0000000-0000-0000-0000-000000000001'::uuid, 1::smallint)$q$, 'error:not_verified');
select t.exec('suspended member cannot post jobs', :C, 'authenticated',
  $q$insert into public.jobs(submitted_by,title,company,location,description,apply_url) values ('a0000000-0000-0000-0000-000000000003','Another','Acme','Pune','A long enough description here','https://acme.test/apply')$q$, 'error:row-level security');
select t.exec('admin verifies pending member', :AD, 'authenticated', $q$update public.profiles set verification_status='verified' where id='a0000000-0000-0000-0000-000000000002'$q$, 'ok');
select t.exec('newly verified member can now post', :B, 'authenticated',
  $q$insert into public.jobs(submitted_by,title,company,location,description,apply_url) values ('a0000000-0000-0000-0000-000000000002','Surveyor','Acme','Pune','A long enough description here','https://acme.test/apply')$q$, 'ok');

-- ------------------------------------------------------------------ storage
insert into storage.buckets (id, name) values ('avatars','avatars'), ('job-logos','job-logos'), ('event-banners','event-banners'), ('article-images','article-images'), ('covers','covers')
  on conflict do nothing;
select t.exec('storage: member uploads own avatar', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('avatars','a0000000-0000-0000-0000-000000000001/me.png')$q$, 'ok');
select t.exec('storage: cannot upload into another member folder', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('avatars','a0000000-0000-0000-0000-000000000003/me.png')$q$, 'error:row-level security');
select t.exec('storage: svg/html files rejected', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('avatars','a0000000-0000-0000-0000-000000000001/evil.svg')$q$, 'error:row-level security');
select t.exec('storage: path traversal rejected', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('avatars','a0000000-0000-0000-0000-000000000001/../a0000000-0000-0000-0000-000000000003/x.png')$q$, 'error:row-level security');
select t.exec('storage: members cannot upload event banners', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('event-banners','events/x.png')$q$, 'error:row-level security');
select t.exec('storage: admin uploads event banner', :AD, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('event-banners','events/annual-meet.webp')$q$, 'ok');
select t.exec('storage: verified member uploads job logo', :A, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('job-logos','a0000000-0000-0000-0000-000000000001/logo.png')$q$, 'ok');
select t.exec('storage: suspended member cannot upload job logo', :C, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('job-logos','a0000000-0000-0000-0000-000000000003/logo.png')$q$, 'error:row-level security');
select t.exec('storage: anon cannot upload', null, 'anon', $q$insert into storage.objects(bucket_id,name) values ('avatars','a0000000-0000-0000-0000-000000000001/x.png')$q$, 'error:row-level security');
select t.exec('storage: member lists only own files', :A, 'authenticated', $q$select * from storage.objects where bucket_id='avatars'$q$, 'count:1');
select t.exec('storage: member cannot delete another member file', :C, 'authenticated', $q$delete from storage.objects where bucket_id='avatars'$q$, 'rows0');
select t.exec('storage: admin can delete member image (moderation)', :AD, 'authenticated', $q$delete from storage.objects where bucket_id='avatars'$q$, 'ok');


-- ------------------------------------------------------------------ admin member list
select t.exec('anon cannot call admin_list_members', null, 'anon', $q$select * from public.admin_list_members()$q$, 'error:permission denied');
select t.exec('member cannot list members (and cannot read emails)', :A, 'authenticated', $q$select * from public.admin_list_members()$q$, 'error:not_allowed');
select t.exec('admin lists members with emails', :AD, 'authenticated', $q$select * from public.admin_list_members() where email like '%@example.test'$q$, 'count:6');
select t.exec('admin filters by status', :AD, 'authenticated', $q$select * from public.admin_list_members('suspended')$q$, 'count:1');


-- ------------------------------------------------------------------ roles and permissions (migration 8)
select t.exec('old admin table is gone', null, 'postgres', $q$select 1 from pg_tables where tablename='app_admins'$q$, 'count:0');
select t.exec('old is_admin function is gone', null, 'postgres', $q$select 1 from pg_proc where proname='is_admin'$q$, 'count:0');
select t.exec('anon cannot call my_access', null, 'anon', $q$select public.my_access()$q$, 'error:permission denied');
select t.exec('anon cannot call admin_dashboard', null, 'anon', $q$select public.admin_dashboard()$q$, 'error:permission denied');
select t.exec('anon cannot call admin_assign_role', null, 'anon', $q$select public.admin_assign_role('a@b.c','faculty')$q$, 'error:permission denied');
select t.exec('plain member has no permissions', :A, 'authenticated', $q$select 1 from public.my_access() a where jsonb_array_length(a->'permissions') = 0$q$, 'count:1');
select t.exec('faculty permissions listed', :F, 'authenticated', $q$select 1 from public.my_access() a where a->'permissions' ? 'jobs.review' and not (a->'permissions' ? 'roles.manage')$q$, 'count:1');
select t.exec('superadmin has every permission', :AD, 'authenticated', $q$select 1 from public.my_access() a where jsonb_array_length(a->'permissions') = 12 and (a->>'superadmin')::boolean$q$, 'count:1');
select t.exec('member cannot open dashboard', :A, 'authenticated', $q$select public.admin_dashboard()$q$, 'error:not_allowed');
select t.exec('faculty opens dashboard', :F, 'authenticated', $q$select public.admin_dashboard()$q$, 'count:1');
select t.exec('faculty cannot see full audit log size', :F, 'authenticated', $q$select * from public.admin_recent_activity(100)$q$, 'error:not_allowed');
select t.exec('faculty sees short activity feed', :F, 'authenticated', $q$select * from public.admin_recent_activity(10)$q$, 'ok');
select t.exec('faculty cannot read moderation log table', :F, 'authenticated', $q$select * from public.moderation_logs$q$, 'count:0');
select t.exec('admin reads moderation log table', :AA, 'authenticated', $q$select * from public.moderation_logs$q$, 'ok');
select t.exec('faculty lists members', :F, 'authenticated', $q$select * from public.admin_list_members()$q$, 'ok');
select t.exec('faculty cannot list staff', :F, 'authenticated', $q$select * from public.admin_list_staff()$q$, 'error:not_allowed');
select t.exec('admin cannot list staff', :AA, 'authenticated', $q$select * from public.admin_list_staff()$q$, 'error:not_allowed');
select t.exec('admin cannot assign roles', :AA, 'authenticated', $q$select public.admin_assign_role('alice@example.test','faculty')$q$, 'error:not_allowed');
select t.exec('faculty cannot assign roles', :F, 'authenticated', $q$select public.admin_assign_role('alice@example.test','faculty')$q$, 'error:not_allowed');
select t.exec('faculty cannot read site settings admin write', :F, 'authenticated', $q$insert into public.site_settings(key,value) values ('x','{}')$q$, 'error:row-level security');
select t.exec('faculty cannot create departments', :F, 'authenticated', $q$insert into public.departments(name,slug) values ('X','x')$q$, 'error:row-level security');
select t.exec('faculty reads contact messages', :F, 'authenticated', $q$select * from public.contact_messages$q$, 'count:1');
select t.exec('faculty creates events', :F, 'authenticated', $q$insert into public.events(id,title,starts_at,status) values ('e0000000-0000-0000-0000-000000000099','Faculty talk', now()+interval '9 days','published')$q$, 'ok');
select t.exec('faculty uploads event banner', :F, 'authenticated', $q$insert into storage.objects(bucket_id,name) values ('event-banners','events/faculty.webp')$q$, 'ok');
select t.exec('superadmin assigns faculty role by email', :AD, 'authenticated', $q$select public.admin_assign_role('Carol@Example.test','faculty')$q$, 'ok');
select t.exec('  ...Carol now holds faculty', null, 'postgres', $q$select 1 from public.user_roles where user_id='a0000000-0000-0000-0000-000000000003' and role_key='faculty'$q$, 'count:1');
select t.exec('  ...grant was logged', null, 'postgres', $q$select 1 from public.moderation_logs where entity_type='role' and action='granted: faculty'$q$, 'count:1');
select t.exec('unknown email rejected', :AD, 'authenticated', $q$select public.admin_assign_role('nobody@example.test','faculty')$q$, 'error:user_not_found');
select t.exec('unknown role rejected', :AD, 'authenticated', $q$select public.admin_assign_role('alice@example.test','ghost')$q$, 'error:role_not_found');
select t.exec('superadmin lists staff', :AD, 'authenticated', $q$select * from public.admin_list_staff()$q$, 'count:4');
select t.exec('superadmin removes faculty role', :AD, 'authenticated', $q$select public.admin_remove_role('a0000000-0000-0000-0000-000000000003','faculty')$q$, 'ok');
select t.exec('last superadmin cannot be removed', :AD, 'authenticated', $q$select public.admin_remove_role('a0000000-0000-0000-0000-000000000004','superadmin')$q$, 'error:last_superadmin');
select t.exec('superadmin role cannot be edited', :AD, 'authenticated', $q$select public.admin_save_role('superadmin','Hacked','x', array['jobs.review'])$q$, 'error:locked_role');
select t.exec('superadmin role cannot be deleted', :AD, 'authenticated', $q$select public.admin_delete_role('superadmin')$q$, 'error:locked_role');
select t.exec('create custom role', :AD, 'authenticated', $q$select public.admin_save_role('coordinator','Batch coordinator','Helps verify alumni', array['dashboard.view','members.review'])$q$, 'ok');
select t.exec('  ...custom role has its permissions', null, 'postgres', $q$select 1 from public.role_permissions where role_key='coordinator'$q$, 'count:2');
select t.exec('unknown permission rejected', :AD, 'authenticated', $q$select public.admin_save_role('coordinator','Batch coordinator','x', array['nope.nope'])$q$, 'error:unknown_permission');
select t.exec('bad role key rejected', :AD, 'authenticated', $q$select public.admin_save_role('Bad Key','Bad','x', array[]::text[])$q$, 'error:');
select t.exec('assign custom role', :AD, 'authenticated', $q$select public.admin_assign_role('carol@example.test','coordinator')$q$, 'ok');
select t.exec('custom role grants its permission (verify members)', :C, 'authenticated', $q$update public.profiles set verification_status='verified' where id='a0000000-0000-0000-0000-000000000001'$q$, 'ok');
select t.exec('custom role does not grant others (jobs review)', :C, 'authenticated', $q$update public.jobs set status='approved' where id='b0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('role in use cannot be deleted', :AD, 'authenticated', $q$select public.admin_delete_role('coordinator')$q$, 'error:role_in_use');
select t.exec('removing a permission takes effect immediately', :AD, 'authenticated', $q$select public.admin_save_role('coordinator','Batch coordinator','x', array['dashboard.view'])$q$, 'ok');
select t.exec('  ...Carol can no longer verify members', :C, 'authenticated', $q$update public.profiles set verification_status='suspended' where id='a0000000-0000-0000-0000-000000000001'$q$, 'rows0');
select t.exec('built-in role in use cannot be deleted', :AD, 'authenticated', $q$select public.admin_delete_role('faculty')$q$, 'error:role_in_use');
select t.exec('admin cannot save roles', :AA, 'authenticated', $q$select public.admin_save_role('x1','X','x', array[]::text[])$q$, 'error:not_allowed');
select t.exec('faculty job posting goes live directly', :F, 'authenticated', $q$insert into public.jobs(id,submitted_by,title,company,location,description,apply_url,status)
  values ('b0000000-0000-0000-0000-000000000077','a0000000-0000-0000-0000-000000000006','Site engineer','Acme','Pune','A long enough description here','https://acme.test/apply','pending')$q$, 'ok');
select t.exec('  ...it is approved and public', null, 'postgres', $q$select 1 from public.jobs_public where id='b0000000-0000-0000-0000-000000000077'$q$, 'count:1');
select t.exec('member job posting still waits for review', null, 'postgres', $q$select 1 from public.jobs where status='pending'$q$, 'ok');

select t.exec('anon cannot list registrants', null, 'anon', $q$select * from public.admin_event_registrations('e0000000-0000-0000-0000-000000000001')$q$, 'error:permission denied');
select t.exec('member cannot list registrants', :A, 'authenticated', $q$select * from public.admin_event_registrations('e0000000-0000-0000-0000-000000000001')$q$, 'error:not_allowed');
select t.exec('faculty lists registrants with email', :F, 'authenticated', $q$select * from public.admin_event_registrations('e0000000-0000-0000-0000-000000000001') where email like '%@example.test'$q$, 'count:2');
select t.exec('custom role without events.manage cannot list registrants', :C, 'authenticated', $q$select * from public.admin_event_registrations('e0000000-0000-0000-0000-000000000001')$q$, 'error:not_allowed');

-- ------------------------------------------------------------------ report
\echo
\echo ===== RESULTS =====
select case when ok then 'PASS' else 'FAIL' end as r, label, case when ok then '' else outcome end as detail from t.results order by n;
select count(*) filter (where ok) as passed, count(*) as total from t.results;
