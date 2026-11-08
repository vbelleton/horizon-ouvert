-- Connecteur santé : jeton, écriture, isolation.
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c1'), ('00000000-0000-0000-0000-0000000000c2') on conflict do nothing;
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false); end $$;
set role authenticated;
do $$
declare t text; r jsonb; n int;
begin
  t := public.create_ingest_token();
  assert t like 'ho_%' and length(t) = 67, 'format du jeton';
  perform set_config('test.tok', t, false);
  begin
    perform token_hash from public.ingest_token;
    raise exception 'le client ne doit pas lire l''empreinte';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

set role anon;
do $$
declare r jsonb; t text := current_setting('test.tok');
begin
  r := public.ingest_health(t, '{"day":"2026-11-08","weight_kg":81.24,"sleep_hours":7.06,"resting_hr":58.4}');
  assert r->'recorded' = '["weight_kg","sleep_hours","resting_hr"]'::jsonb, 'trois mesures notées';
  perform public.ingest_health(t, '{"day":"2026-11-08","weight_kg":80.9}');  -- idempotent, mise à jour
  begin
    perform public.ingest_health('ho_faux', '{"weight_kg":80}');
    raise exception 'jeton faux accepté';
  exception when sqlstate '28000' then null;
  end;
  begin
    perform public.ingest_health(t, '{"weight_kg":900}');
    raise exception 'poids absurde accepté';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.ingest_health(t, '{"day":"2020-01-01","weight_kg":80}');
    raise exception 'jour trop ancien accepté';
  exception when sqlstate '22023' then null;
  end;
end $$;
reset role;

do $$
declare n int;
begin
  select count(*) into n from public.measurement m join public.indicator i on i.id = m.indicator_id
   where m.user_id = '00000000-0000-0000-0000-0000000000c1' and i.key = 'poids' and m.value = 80.9;
  assert n = 1, 'poids mis à jour sans doublon, obtenu ' || n;
  assert (select sleep_hours from public.checkin where user_id = '00000000-0000-0000-0000-0000000000c1' and day = '2026-11-08') = 7.1, 'sommeil arrondi';
  assert (select count(*) from public.measurement where user_id = '00000000-0000-0000-0000-0000000000c2') = 0, 'rien pour l''autre personne';
  assert (select count(*) from public.indicator where user_id = '00000000-0000-0000-0000-0000000000c1' and domain_id = (select id from public.domain where user_id = '00000000-0000-0000-0000-0000000000c1' and key = 'sante') and is_active) <= 3, 'max 3 indicateurs en santé';
  assert (select last_used_at from public.ingest_token where user_id = '00000000-0000-0000-0000-0000000000c1') is not null, 'dernier usage noté';
end $$;

-- l'autre personne ne voit pas le jeton, et le remplacer invalide l'ancien
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false); end $$;
set role authenticated;
do $$ begin assert (select count(*) from public.ingest_token) = 0, 'jeton de l''autre visible'; end $$;
reset role;
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false); end $$;
set role authenticated;
do $$ declare old text := current_setting('test.tok'); new text;
begin
  new := public.create_ingest_token();
  assert new <> old, 'nouveau jeton';
  begin
    perform public.ingest_health(old, '{"weight_kg":80}');
    raise exception 'ancien jeton encore valide';
  exception when sqlstate '28000' then null;
  end;
  perform public.revoke_ingest_token();
  begin
    perform public.ingest_health(new, '{"weight_kg":80}');
    raise exception 'jeton révoqué encore valide';
  exception when sqlstate '28000' then null;
  end;
end $$;
reset role;
select 'OK : connecteur santé' as resultat;
