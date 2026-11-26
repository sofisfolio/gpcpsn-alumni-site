-- GPCPSN Alumni Network | 5 - launch with Civil Engineering only.
-- "Other" stays in the table but is hidden (is_active=false), so adding departments later is one change:
--   update public.departments set is_active = true where slug = 'other';   or insert a new row.
update public.departments set is_active = false where slug = 'other';
