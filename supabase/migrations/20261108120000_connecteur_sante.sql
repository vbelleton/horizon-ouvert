-- Connecteur santé : l'iPhone (Raccourci ou Health Auto Export) envoie poids,
-- sommeil et fréquence cardiaque au repos, sans saisie. Pas de clé secrète
-- côté serveur : une fonction SQL reçoit un jeton personnel (haché en base)
-- et n'écrit que pour la personne à qui il appartient.

create table public.ingest_token (
  user_id uuid primary key references auth.users on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.ingest_token enable row level security;
create policy "chacun son jeton" on public.ingest_token for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.ingest_token from anon, authenticated;
-- Le client voit qu'un jeton existe et quand il a servi, jamais son empreinte.
grant select (user_id, created_at, last_used_at) on public.ingest_token to authenticated;

-- Crée (ou remplace) le jeton ; le jeton en clair n'est rendu qu'une fois.
create function public.create_ingest_token() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  token text;
begin
  if uid is null then raise exception 'non connecté' using errcode = '28000'; end if;
  token := 'ho_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.ingest_token (user_id, token_hash)
  values (uid, sha256(convert_to(token, 'utf8')))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash, created_at = now(), last_used_at = null;
  return token;
end;
$$;

create function public.revoke_ingest_token() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ingest_token where user_id = auth.uid();
end;
$$;

-- Reçoit {"day":"2026-11-08","weight_kg":81.2,"sleep_hours":7.1,"resting_hr":58}.
-- Tous les champs sont facultatifs ; "day" vaut aujourd'hui (fuseau du profil) par défaut.
create function public.ingest_health(p_token text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  tz text;
  today date;
  d date;
  v numeric;
  done jsonb := '[]'::jsonb;
begin
  select t.user_id into uid from public.ingest_token t
   where t.token_hash = sha256(convert_to(coalesce(p_token, ''), 'utf8'));
  if uid is null then raise exception 'jeton invalide' using errcode = '28000'; end if;
  update public.ingest_token set last_used_at = now() where user_id = uid;

  select timezone into tz from public.profile where user_id = uid;
  today := (now() at time zone coalesce(tz, 'Europe/Paris'))::date;
  d := coalesce((p_payload->>'day')::date, today);
  if d > today + 1 or d < today - 35 then
    raise exception 'jour hors limites' using errcode = '22023';
  end if;

  v := (p_payload->>'weight_kg')::numeric;
  if v is not null then
    if v not between 20 and 400 then raise exception 'poids invalide' using errcode = '22023'; end if;
    insert into public.measurement (indicator_id, user_id, day, value)
    select i.id, uid, d, round(v, 1) from public.indicator i where i.user_id = uid and i.key = 'poids'
    on conflict (indicator_id, day) do update set value = excluded.value;
    done := done || '"weight_kg"'::jsonb;
  end if;

  v := (p_payload->>'sleep_hours')::numeric;
  if v is not null then
    if v not between 0 and 24 then raise exception 'sommeil invalide' using errcode = '22023'; end if;
    insert into public.checkin (user_id, day, sleep_hours) values (uid, d, round(v, 1))
    on conflict (user_id, day) do update set sleep_hours = excluded.sleep_hours;
    done := done || '"sleep_hours"'::jsonb;
  end if;

  v := (p_payload->>'resting_hr')::numeric;
  if v is not null then
    if v not between 25 and 220 then raise exception 'fréquence invalide' using errcode = '22023'; end if;
    insert into public.indicator (user_id, domain_id, key, label, unit, direction, source, position)
    select uid, dm.id, 'fc_repos', 'Fréquence cardiaque au repos', 'bpm', 'down', 'import', 3
      from public.domain dm where dm.user_id = uid and dm.key = 'sante'
    on conflict (user_id, key) do nothing;
    insert into public.measurement (indicator_id, user_id, day, value)
    select i.id, uid, d, round(v) from public.indicator i where i.user_id = uid and i.key = 'fc_repos'
    on conflict (indicator_id, day) do update set value = excluded.value;
    done := done || '"resting_hr"'::jsonb;
  end if;

  return jsonb_build_object('day', d, 'recorded', done);
end;
$$;

revoke all on function public.create_ingest_token(), public.revoke_ingest_token(), public.ingest_health(text, jsonb) from public, anon, authenticated;
grant execute on function public.create_ingest_token(), public.revoke_ingest_token() to authenticated;
grant execute on function public.ingest_health(text, jsonb) to anon, authenticated;
