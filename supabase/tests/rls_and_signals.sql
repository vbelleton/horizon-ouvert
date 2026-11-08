-- Vérifie le socle : initialisation d'un compte, isolation RLS, clés
-- composites, dernier contact, signaux. Toute erreur arrête le script.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.org');

do $$ begin
  assert (select count(*) from public.domain where user_id = '00000000-0000-0000-0000-00000000000a') = 7,
    'un nouveau compte doit recevoir 7 domaines';
  assert (select count(*) from public.indicator where user_id = '00000000-0000-0000-0000-00000000000a') = 7,
    'un nouveau compte doit recevoir 7 indicateurs';
  assert exists (select from public.domain where user_id = '00000000-0000-0000-0000-00000000000a' and key = 'responsabilites' and label = 'Responsabilités'),
    'le domaine Responsabilités doit exister';
end $$;

-- ---- En tant que A -----------------------------------------------------
set role authenticated;
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false); end $$;

do $$ begin
  assert (select count(*) from public.domain) = 7, 'A ne doit voir que ses 7 domaines';
  assert (select count(*) from public.profile) = 1, 'A ne doit voir que son profil';
end $$;

-- Check-ins : 3 nuits courtes => signal sommeil
insert into public.checkin (user_id, day, energy, peace, sleep_hours)
select auth.uid(), (now() at time zone 'Europe/Paris')::date - g, 3, 3, 5.5 from generate_series(0, 2) g;

-- Proche intime jamais contacté, puis contacté hier : last_contact_on suit
insert into public.person (user_id, name, circle, cadence_days) values (auth.uid(), 'Maman', 'intime', 7);
do $$ begin
  assert exists (select from public.signals where rule = 'proches_intimes'), 'Maman jamais contactée doit lever un signal';
end $$;
insert into public.interaction (user_id, person_id, day, kind)
select auth.uid(), id, (now() at time zone 'Europe/Paris')::date - 1, 'appel' from public.person where name = 'Maman';
insert into public.interaction (user_id, person_id, day, kind)
select auth.uid(), id, (now() at time zone 'Europe/Paris')::date - 30, 'visite' from public.person where name = 'Maman';
do $$ begin
  assert (select last_contact_on from public.person where name = 'Maman') = (now() at time zone 'Europe/Paris')::date - 1,
    'last_contact_on doit valoir le contact le plus récent, pas le dernier saisi';
  assert not exists (select from public.signals where rule = 'proches_intimes'), 'Maman contactée hier ne doit plus lever de signal';
end $$;

-- Engagement sans prochaine étape
insert into public.commitment (user_id, domain_id, title)
select auth.uid(), id, 'Conseil de l''église' from public.domain where key = 'responsabilites';

-- Réserve sous la cible
insert into public.measurement (indicator_id, user_id, day, value)
select id, auth.uid(), (now() at time zone 'Europe/Paris')::date, 2 from public.indicator where key = 'mois_reserve';

do $$
declare rules text[];
begin
  select array_agg(rule order by rule) into rules from public.signals;
  assert rules @> array['sommeil', 'sans_prochaine_etape', 'reserve'],
    format('signaux attendus absents : %s', rules);
  assert not (rules @> array['revue']), 'un compte de moins de 14 jours ne doit pas être relancé sur la revue';
  assert (select message from public.signals where rule = 'sommeil') = 'Sommeil moyen de 5,5 h sur 7 jours',
    'les nombres des messages s''écrivent à la française';
end $$;

-- Pouls bas deux revues de suite
insert into public.review (user_id, week_start, completed_at) values
  (auth.uid(), '2026-10-19', now()), (auth.uid(), '2026-10-26', now());
insert into public.domain_pulse (review_id, domain_id, user_id, score)
select r.id, d.id, auth.uid(), 2 from public.review r cross join public.domain d where d.key = 'temps';
do $$ begin
  assert exists (select from public.signals where rule = 'pouls_bas' and domain_key = 'temps'), 'pouls bas attendu sur Temps';
end $$;

-- ---- En tant que B -----------------------------------------------------
do $$ begin perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false); end $$;

do $$ begin
  assert (select count(*) from public.checkin) = 0, 'B ne doit pas voir les check-ins de A';
  assert (select count(*) from public.person) = 0, 'B ne doit pas voir les proches de A';
  assert (select count(*) from public.signals) = 0, 'B ne doit pas voir les signaux de A';
  assert (select count(*) from public.domain) = 7, 'B voit ses propres domaines';
end $$;

-- B ne peut pas écrire au nom de A
do $$ begin
  begin
    insert into public.checkin (user_id, day) values ('00000000-0000-0000-0000-00000000000a', '2026-11-01');
    raise exception 'B a pu écrire un check-in au nom de A';
  exception when insufficient_privilege then null;
  end;
end $$;

-- B ne peut pas rattacher sa mesure à l'indicateur de A, même avec l'uuid
do $$
declare ind uuid;
begin
  reset role;
  select id into ind from public.indicator where user_id = '00000000-0000-0000-0000-00000000000a' and key = 'poids';
  set role authenticated;
  begin
    insert into public.measurement (indicator_id, user_id, day, value) values (ind, auth.uid(), '2026-11-01', 70);
    raise exception 'B a pu rattacher une mesure à l''indicateur de A';
  exception when foreign_key_violation then null;
  end;
end $$;

-- B ne peut pas modifier ni supprimer les lignes de A
update public.person set name = 'pirate';
delete from public.checkin;
reset role;
do $$ begin
  assert (select count(*) from public.person where name = 'Maman') = 1, 'la personne de A ne doit pas avoir changé';
  assert (select count(*) from public.checkin where user_id = '00000000-0000-0000-0000-00000000000a') = 3, 'les check-ins de A doivent rester';
end $$;

-- ---- anon : rien du tout -------------------------------------------------
set role anon;
do $$ begin
  begin
    perform 1 from public.checkin;
    raise exception 'anon a pu lire les check-ins';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- seed_user n'est pas appelable par un client
set role authenticated;
do $$ begin
  begin
    perform public.seed_user(auth.uid());
    raise exception 'seed_user ne doit pas être appelable par authenticated';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'OK : socle, RLS et signaux vérifiés' as resultat;
