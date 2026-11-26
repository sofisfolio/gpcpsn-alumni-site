-- GPCPSN Alumni Network | 4/4 reference data
-- Taxonomy only (departments and categories). No people, jobs, events, testimonials or statistics are seeded.
-- Administrators add further departments/categories later from the admin area.

insert into public.departments (slug, name, sort_order) values
  ('civil-engineering', 'Civil Engineering', 1),
  ('other', 'Other / not listed', 99)
on conflict (slug) do nothing;

insert into public.event_categories (slug, name, sort_order) values
  ('alumni-reunions', 'Alumni reunions', 1),
  ('networking', 'Networking', 2),
  ('workshops', 'Workshops', 3),
  ('conferences', 'Conferences', 4),
  ('webinars', 'Webinars', 5),
  ('institute-events', 'Institute events', 6)
on conflict (slug) do nothing;

insert into public.article_categories (slug, name, sort_order) values
  ('alumni-stories', 'Alumni Stories', 1),
  ('institute-news', 'Institute News', 2),
  ('career-insights', 'Career Insights', 3),
  ('research-innovation', 'Research & Innovation', 4),
  ('industry-updates', 'Industry Updates', 5),
  ('alumni-activities', 'Alumni Activities', 6)
on conflict (slug) do nothing;
