-- Rejoue deux fois le SQL généré par scripts/import-routine-tracker.mjs.
-- Attend :import_sql (chemin du fichier généré).
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a') on conflict do nothing;
\i :import_sql
\i :import_sql
do $$
declare n int;
begin
  select count(*) into n from public.measurement m join public.indicator i on i.id = m.indicator_id where i.key = 'poids' and m.user_id = '00000000-0000-0000-0000-00000000000a';
  if n <> 2 then raise exception 'poids: % lignes au lieu de 2', n; end if;
  select count(*) into n from public.measurement m join public.indicator i on i.id = m.indicator_id where i.key = 'patrimoine' and m.user_id = '00000000-0000-0000-0000-00000000000a';
  if n <> 2 then raise exception 'patrimoine: % lignes au lieu de 2', n; end if;
  select count(*) into n from public.journal_entry where user_id = '00000000-0000-0000-0000-00000000000a';
  if n <> 2 then raise exception 'journal: % lignes au lieu de 2', n; end if;
  if not exists (select 1 from public.journal_entry where body like '%l''église d''Aix' || E'\n' || 'et ses familles%(Ph 4:6) (exaucée)') then raise exception 'apostrophes/retours ligne perdus'; end if;
  select count(*) into n from public.indicator where user_id = '00000000-0000-0000-0000-00000000000a' and is_active and domain_id = (select id from public.domain where user_id = '00000000-0000-0000-0000-00000000000a' and key = 'finances');
  if n > 3 then raise exception 'finances: % indicateurs actifs', n; end if;
  raise notice 'import OK';
end $$;
