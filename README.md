# Horizon Ouvert

**Voir clairement. Discerner sereinement. Garder le cap.**

Nous mesurons beaucoup de choses.
Nos pas. Nos tâches. Nos dépenses. Nos rendez-vous.
Pourtant, il est possible de perdre de vue l'essentiel.

Horizon Ouvert n'a pas été conçu pour optimiser une personne.
Il a été conçu pour l'aider à discerner.

Santé. Relations. Temps. Finances. Responsabilités. Croissance. Vie spirituelle.

Non pas pour obtenir une meilleure note.
Mais pour garder le cap.

**Observer. Discerner. Ajuster.**

---

## Démarrer

Prérequis : Node 22, un projet [Supabase](https://supabase.com) en région UE.

1. **Base de données.** Dans Supabase → SQL Editor, exécuter `supabase/migrations/20261107120000_socle.sql` (ou `npx supabase db push` avec la CLI liée au projet). Chaque nouveau compte reçoit automatiquement son profil, les 7 domaines et les indicateurs par défaut.
2. **Connexion par lien magique.** Supabase → Authentication → URL Configuration : `Site URL` = l'URL Cloudflare Pages, et ajouter `http://localhost:3000/app` et `https://<projet>.pages.dev/app` aux redirections autorisées.
3. **Variables.** Copier `.env.example` en `.env` et renseigner l'URL et la clé `anon` (Settings → API).
4. `npm install && npm run dev`, puis ouvrir http://localhost:3000.

## Déployer sur Cloudflare Pages

Relier ce dépôt à un projet Cloudflare Pages : commande de build `npm run build`, dossier de sortie `dist`, variable `NODE_VERSION=22`, et les deux variables `NUXT_PUBLIC_SUPABASE_*` pour la production **et** les aperçus. Chaque push sur `main` met en ligne ; chaque pull request a son aperçu.

## Vérifier

```bash
npm run typecheck
npm run test:unit   # dates, en fuseau Europe/Paris
npm run test:db     # migrations + RLS + signaux sur un Postgres local
```

La conception complète est dans le [document de conception](https://claude.ai/artifact/1nveEgsqES2NdawGsZQvWR) ; les règles de travail dans `CLAUDE.md`.
