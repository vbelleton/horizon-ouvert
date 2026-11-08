# CLAUDE.md

Guide pour Claude dans ce dépôt. La conception complète (vision, modèle de données, écrans, indicateurs, feuille de route) est dans le document de conception : https://claude.ai/artifact/1nveEgsqES2NdawGsZQvWR

## Identité du produit (à respecter avant toute fonctionnalité)

Horizon Ouvert est un **système de discernement**, un compagnon de discernement personnel. Il n'est pas :

- un gestionnaire de tâches
- un tracker d'habitudes
- un second cerveau
- un outil de développement personnel
- un réseau social
- un coach de vie

Chaque fonctionnalité doit répondre à la question : **« Aide-t-elle réellement la personne à discerner ce qui est important et à garder le cap ? »** Sinon, elle est rejetée, même si elle est demandée en passant.

Conséquences concrètes : pas de séries (streaks), pas de badges, pas de score global de vie, pas de compteur de tâches terminées, jamais de rouge vif. Un indicateur n'entre que si l'on peut nommer la décision qu'il éclaire (3 au plus par domaine). Les 7 domaines : Santé, Relations, Finances, Temps, Responsabilités, Croissance, Vie spirituelle.

## Stack

- Nuxt 3 (Vue 3, TypeScript strict). Page d'accueil publique en SSR, `/app/**` et `/connexion` en SPA (`routeRules`).
- Supabase (région UE) : Auth par lien magique, Postgres + RLS. Le navigateur parle directement à Supabase avec le jeton de la personne.
- Cloudflare Pages (preset Nitro `cloudflare-pages`), sortie dans `dist/`.
- Node 22 (Volta).

## Commandes

```bash
npm run dev          # dev local (nécessite .env, voir .env.example)
npm run build        # build Cloudflare Pages dans dist/
npm run typecheck
npm run test:unit    # tests unitaires en fuseau Europe/Paris
npm run test:db      # applique les migrations sur un Postgres local jetable + vérifie RLS et signaux
npm run test:e2e     # build Node + parcours complet dans un navigateur, contre un faux Supabase en mémoire
```

## Tests

- `test:db` vérifie la **sécurité** (RLS, clés composites, signaux) sur un vrai Postgres ; `test:e2e` vérifie l'**interface** (ce qu'elle lit, écrit, et le jour envoyé). Le faux Supabase de `tests/e2e/mock-supabase.ts` ne remplace jamais le premier.
- Si Playwright ne trouve pas son navigateur : `PW_CHROMIUM_PATH=<chemin de chrome> npx playwright test`.
- Une nouvelle saisie ou lecture = une étape dans `tests/e2e/parcours.spec.ts` ; une nouvelle table = un cas dans `supabase/tests/rls_and_signals.sql`.

## Pièges non évidents

- **Jamais `toISOString().slice(0, 10)` pour un jour.** En France, le soir, cela donne le lendemain (UTC) ; sur une date construite à minuit local, la veille. Toujours `isoDay()` de `utils/dates.ts`, avec le fuseau du profil. Le piège a déjà cassé Cieux Ouverts et Routine Tracker.
- **Un jour se stocke en `date` Postgres**, jamais en timestamp tronqué. Côté SQL, « aujourd'hui » = `(now() at time zone profile.timezone)::date`, pas `current_date` (qui est en UTC sur Supabase).
- **Toute nouvelle table** : colonne `user_id`, RLS « chacun ses lignes », `revoke all … from anon`, et clés étrangères composites `(x_id, user_id)` vers une table qui a `unique (id, user_id)`. Sans clé composite, quelqu'un pourrait rattacher sa ligne à l'objet d'un autre en connaissant son uuid (la RLS ne contrôle que `user_id`). Ajouter le cas à `supabase/tests/rls_and_signals.sql`.
- **Les vues** se créent `with (security_invoker = true)`, sinon elles contournent la RLS.
- **Les indicateurs calculés et les signaux sont des vues SQL** (`signals`, `people_due`), pas du code front. Un nouveau signal = une branche `union all` dans `signals` + un test.
- **Ne jamais sauvegarder ce qu'on n'a pas réussi à lire** (leçon de Cieux Ouverts) : un auto-save ne doit jamais écraser une ligne dont la lecture a échoué.
- **En-têtes de sécurité** : source unique dans `routeRules` (`nuxt.config.ts`). Ne pas les redéclarer dans `public/_headers` : Cloudflare joindrait les deux valeurs par une virgule et les navigateurs les ignoreraient.
- **Les types de ligne de `types/database.ts` sont des `type`, pas des `interface`** : supabase-js exige `Record<string, unknown>`, et une `interface` n'a pas de signature d'index, ce qui fait tomber tous les `insert`/`update` en `never`.
- **Saisie quotidienne** : le sommeil par défaut (7 h) n'est enregistré que si la personne touche le compteur ; un défaut ne doit jamais devenir une donnée.
- **Connecteurs entrants** (santé, plus tard agenda/finances) : jamais de clé `service_role` côté serveur. Une fonction SQL `security definer` reçoit un jeton personnel (haché, `ingest_token`), n'écrit que pour son propriétaire, valide les bornes, et est testée dans `supabase/tests/ingest_check.sql`.
- **`types/database.ts` est écrit à la main** pour le socle ; le régénérer avec `npx supabase gen types typescript --project-id <id>` dès que le projet Supabase existe.
