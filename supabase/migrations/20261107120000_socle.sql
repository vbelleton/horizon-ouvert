-- Horizon Ouvert : socle du MVP (semaine 1).
--
-- Principes :
--   * chaque ligne appartient à une personne (user_id) et la base l'impose
--     par RLS, pas seulement le code ;
--   * les clés étrangères sont composites (id, user_id) : impossible de
--     rattacher une mesure à l'indicateur de quelqu'un d'autre, même en
--     connaissant son uuid ;
--   * un jour est une `date` dans le fuseau de la personne, jamais un
--     timestamp tronqué ;
--   * les indicateurs calculés et les signaux sont des vues, pas des tables.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.domain_key as enum (
  'sante', 'relations', 'finances', 'temps',
  'responsabilites', 'croissance', 'spiritualite'
);

create type public.circle_kind as enum ('intime', 'proche', 'communaute');
create type public.commitment_kind as enum ('role', 'projet', 'responsabilite');
create type public.commitment_status as enum ('actif', 'en_pause', 'termine', 'abandonne');
create type public.indicator_direction as enum ('up', 'down', 'range');
create type public.indicator_source as enum ('manual', 'import');
create type public.signal_level as enum ('info', 'attention');

-- ---------------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profile (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text not null default 'Europe/Paris',
  week_starts_on smallint not null default 1 check (week_starts_on in (0, 1)), -- 0 dimanche, 1 lundi
  review_weekday smallint not null default 0 check (review_weekday between 0 and 6), -- 0 = dimanche
  max_active_commitments smallint not null default 7 check (max_active_commitments > 0),
  focus_domains public.domain_key[] not null default '{}', -- 1 à 3 domaines prioritaires (avant les saisons de la V1)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.domain (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  key public.domain_key not null,
  label text not null,
  color text not null,
  position smallint not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key),
  unique (id, user_id)
);

create table public.checkin (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  energy smallint check (energy between 1 and 5),
  peace smallint check (peace between 1 and 5),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  gratitude text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create table public.review (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  highlights text,
  gratitude text,
  concerns text,
  decisions text,
  focus_next text,
  family_time boolean,  -- un vrai temps de qualité en famille cette semaine ?
  rest_day boolean,     -- un vrai jour de repos cette semaine ?
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start),
  unique (id, user_id)
);

create table public.domain_pulse (
  review_id uuid not null,
  domain_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  score smallint check (score between 1 and 5),
  word text,                          -- un mot pour dire l'état du domaine
  hours_estimate numeric(4, 1) check (hours_estimate >= 0),
  primary key (review_id, domain_id),
  foreign key (review_id, user_id) references public.review (id, user_id) on delete cascade,
  foreign key (domain_id, user_id) references public.domain (id, user_id) on delete cascade
);

create table public.commitment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  domain_id uuid not null,
  title text not null,
  kind public.commitment_kind not null default 'responsabilite',
  status public.commitment_status not null default 'actif',
  next_step text,
  review_on date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (domain_id, user_id) references public.domain (id, user_id) on delete cascade
);

create table public.person (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  circle public.circle_kind not null default 'proche',
  cadence_days smallint check (cadence_days > 0), -- tous les combien je veux prendre des nouvelles
  last_contact_on date,                           -- tenu à jour par trigger
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.interaction (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  person_id uuid not null,
  day date not null,
  kind text not null default 'echange', -- appel, visite, message, repas…
  note text,
  created_at timestamptz not null default now(),
  foreign key (person_id, user_id) references public.person (id, user_id) on delete cascade
);

create table public.indicator (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  domain_id uuid not null,
  key text not null,
  label text not null,
  unit text,
  direction public.indicator_direction not null default 'up',
  target numeric,
  target_max numeric,
  source public.indicator_source not null default 'manual',
  is_active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key),
  unique (id, user_id),
  foreign key (domain_id, user_id) references public.domain (id, user_id) on delete cascade
);

create table public.measurement (
  indicator_id uuid not null,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  value numeric not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (indicator_id, day),
  foreign key (indicator_id, user_id) references public.indicator (id, user_id) on delete cascade
);

-- Au MVP, le journal est une simple note datée ; les types (prière,
-- discernement, gratitude…) arrivent en V1 avec l'import de Routine Tracker.
create table public.journal_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  domain_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (domain_id, user_id) references public.domain (id, user_id) on delete cascade
);

create index on public.checkin (user_id, day desc);
create index on public.review (user_id, week_start desc);
create index on public.commitment (user_id, status);
create index on public.interaction (person_id, day desc);
create index on public.measurement (user_id, day desc);
create index on public.journal_entry (user_id, day desc);

-- updated_at
create trigger touch before update on public.profile for each row execute function public.touch_updated_at();
create trigger touch before update on public.domain for each row execute function public.touch_updated_at();
create trigger touch before update on public.checkin for each row execute function public.touch_updated_at();
create trigger touch before update on public.review for each row execute function public.touch_updated_at();
create trigger touch before update on public.commitment for each row execute function public.touch_updated_at();
create trigger touch before update on public.person for each row execute function public.touch_updated_at();
create trigger touch before update on public.indicator for each row execute function public.touch_updated_at();
create trigger touch before update on public.measurement for each row execute function public.touch_updated_at();
create trigger touch before update on public.journal_entry for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Dernier contact : recalculé à chaque ajout, modification ou suppression
-- d'interaction (le plus récent l'emporte, pas le dernier saisi).
-- ---------------------------------------------------------------------------

create function public.refresh_last_contact() returns trigger
language plpgsql as $$
declare
  pid uuid := coalesce(new.person_id, old.person_id);
begin
  update public.person p
     set last_contact_on = (select max(i.day) from public.interaction i where i.person_id = pid)
   where p.id = pid;
  if tg_op = 'UPDATE' and new.person_id is distinct from old.person_id then
    update public.person p
       set last_contact_on = (select max(i.day) from public.interaction i where i.person_id = old.person_id)
     where p.id = old.person_id;
  end if;
  return null;
end;
$$;

create trigger refresh_last_contact
after insert or update or delete on public.interaction
for each row execute function public.refresh_last_contact();

-- ---------------------------------------------------------------------------
-- Sécurité : RLS sur chaque table, même politique partout.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'profile', 'domain', 'checkin', 'review', 'domain_pulse', 'commitment',
    'person', 'interaction', 'indicator', 'measurement', 'journal_entry'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "chacun ses lignes" on public.%I for all to authenticated '
      'using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Initialisation d'un nouveau compte : profil, 7 domaines, indicateurs.
-- ---------------------------------------------------------------------------

create function public.seed_user(uid uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile (user_id) values (uid) on conflict do nothing;

  insert into public.domain (user_id, key, label, color, position) values
    (uid, 'sante',           'Santé',           '#6f9a7e', 1),
    (uid, 'relations',       'Relations',       '#c98b6b', 2),
    (uid, 'finances',        'Finances',        '#7f8fa8', 3),
    (uid, 'temps',           'Temps',           '#b9a46a', 4),
    (uid, 'responsabilites', 'Responsabilités', '#8a7fa3', 5),
    (uid, 'croissance',      'Croissance',      '#5f9aa3', 6),
    (uid, 'spiritualite',    'Vie spirituelle', '#a3866a', 7)
  on conflict (user_id, key) do nothing;

  -- Indicateurs saisis à la main (ou importés). Ceux qui se calculent
  -- (sommeil, énergie, proches, engagements) vivent dans des vues.
  insert into public.indicator (user_id, domain_id, key, label, unit, direction, target, source, position)
  select uid, d.id, v.key, v.label, v.unit, v.direction::public.indicator_direction,
         v.target, v.source::public.indicator_source, v.position
    from (values
      ('sante',        'activite_physique', 'Activité physique',          'séances / sem.', 'up',    3,    'manual', 1),
      ('sante',        'poids',             'Poids',                      'kg',             'range', null, 'import', 2),
      ('finances',     'marge_mensuelle',   'Marge mensuelle',            '€',              'up',    0,    'manual', 1),
      ('finances',     'mois_reserve',      'Mois de réserve',            'mois',           'up',    3,    'manual', 2),
      ('finances',     'generosite',        'Générosité',                 '% des revenus',  'up',    null, 'manual', 3),
      ('croissance',   'apprentissage',     'Pratique d''apprentissage',  'jours / sem.',   'up',    3,    'manual', 1),
      ('spiritualite', 'priere',            'Temps de prière',            'jours / 7',      'up',    null, 'manual', 1)
    ) as v(domain, key, label, unit, direction, target, source, position)
    join public.domain d on d.user_id = uid and d.key = v.domain::public.domain_key
  on conflict (user_id, key) do nothing;
end;
$$;

revoke all on function public.seed_user(uuid) from public, anon, authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Vues (security_invoker : la RLS de la personne connectée s'applique).
-- « Aujourd'hui » se calcule dans le fuseau de chaque profil.
-- ---------------------------------------------------------------------------

create view public.people_due with (security_invoker = true) as
select p.id, p.user_id, p.name, p.circle, p.cadence_days, p.last_contact_on,
       (now() at time zone pr.timezone)::date - p.last_contact_on as days_since
  from public.person p
  join public.profile pr on pr.user_id = p.user_id
 where p.cadence_days is not null
   and (p.last_contact_on is null
        or (now() at time zone pr.timezone)::date - p.last_contact_on > p.cadence_days);

create view public.signals with (security_invoker = true) as
with today as (
  select user_id, (now() at time zone timezone)::date as day, max_active_commitments
    from public.profile
)
-- Sommeil moyen sur 7 jours sous 6,5 h (au moins 3 nuits saisies)
select c.user_id, 'sante'::public.domain_key as domain_key, 'attention'::public.signal_level as level,
       'sommeil' as rule,
       format('Sommeil moyen de %s h sur 7 jours', replace(round(avg(c.sleep_hours), 1)::text, '.', ',')) as message
  from public.checkin c join today t on t.user_id = c.user_id
 where c.day > t.day - 7 and c.sleep_hours is not null
 group by c.user_id
having count(*) >= 3 and avg(c.sleep_hours) < 6.5

union all
-- Énergie basse sur 14 jours
select c.user_id, 'sante', 'attention', 'energie',
       format('Énergie moyenne de %s sur 5 depuis deux semaines', replace(round(avg(c.energy), 1)::text, '.', ','))
  from public.checkin c join today t on t.user_id = c.user_id
 where c.day > t.day - 14 and c.energy is not null
 group by c.user_id
having count(*) >= 5 and avg(c.energy) <= 2

union all
-- Proches du cercle intime au-delà de leur cadence
select pd.user_id, 'relations', 'attention', 'proches_intimes',
       case when count(*) = 1
            then format('%s attend de tes nouvelles', min(pd.name))
            else format('%s proches intimes attendent de tes nouvelles', count(*)) end
  from public.people_due pd
 where pd.circle = 'intime'
 group by pd.user_id

union all
-- Trop d'engagements actifs
select c.user_id, 'responsabilites', 'attention', 'trop_engagements',
       format('%s engagements actifs pour un plafond de %s', count(*), min(t.max_active_commitments))
  from public.commitment c join today t on t.user_id = c.user_id
 where c.status = 'actif'
 group by c.user_id
having count(*) > min(t.max_active_commitments)

union all
-- Engagements actifs sans prochaine étape
select c.user_id, 'responsabilites', 'info', 'sans_prochaine_etape',
       case when count(*) = 1 then '1 engagement sans prochaine étape'
            else format('%s engagements sans prochaine étape', count(*)) end
  from public.commitment c
 where c.status = 'actif' and coalesce(btrim(c.next_step), '') = ''
 group by c.user_id

union all
-- Pouls à 2 ou moins sur les deux dernières revues terminées
select d.user_id, d.key, 'attention', 'pouls_bas',
       format('%s : pouls bas deux semaines de suite', d.label)
  from public.domain d
  join lateral (
    select dp.score
      from public.domain_pulse dp
      join public.review r on r.id = dp.review_id
     where dp.domain_id = d.id and r.completed_at is not null
     order by r.week_start desc
     limit 2
  ) last2 on true
 where d.is_active
 group by d.user_id, d.key, d.label
having count(*) = 2 and max(last2.score) <= 2

union all
-- Pas de revue depuis plus de 14 jours (ou jamais, après 14 jours de compte)
select pr.user_id, null, 'info', 'revue',
       'Pas de revue depuis plus de deux semaines : reprends quand tu veux, sans rattrapage'
  from public.profile pr join today t on t.user_id = pr.user_id
 where t.day - coalesce(
         (select max(r.week_start) + 6 from public.review r
           where r.user_id = pr.user_id and r.completed_at is not null),
         (pr.created_at at time zone pr.timezone)::date
       ) > 14

union all
-- Réserve de précaution sous la cible (dernière mesure)
select i.user_id, 'finances', 'attention', 'reserve',
       format('Réserve de %s mois, sous la cible de %s', replace(m.value::text, '.', ','), replace(i.target::text, '.', ','))
  from public.indicator i
  join lateral (
    select value from public.measurement m
     where m.indicator_id = i.id order by m.day desc limit 1
  ) m on true
 where i.key = 'mois_reserve' and i.is_active and i.target is not null and m.value < i.target;

grant select on public.people_due, public.signals to authenticated;
revoke all on public.people_due, public.signals from anon;
