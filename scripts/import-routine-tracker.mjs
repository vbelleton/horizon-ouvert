#!/usr/bin/env node
// Import unique des données de Routine Tracker (poids, patrimoine, journal
// spirituel) vers Horizon Ouvert. Produit du SQL idempotent à coller dans
// l'éditeur SQL de Supabase : on peut le rejouer sans créer de doublons.
//
// Usage : node scripts/import-routine-tracker.mjs --user <uuid> > import.sql
//   --api   http://localhost:8787   (API de Routine Tracker)
//   --token <jeton>                 (x-access-token, si l'API en demande un)
//   --fixture <fichier.json>        (lit un export au lieu de l'API ; pour les tests)
//   --tz    Europe/Paris            (fuseau pour dater le journal)
import { pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null)

const TYPES = {
  question: 'Question', merci: 'Merci', ressource: 'Ressource', personne: 'Personne',
  priere_fervente: 'Prière fervente', verset: 'Verset', gratitude: 'Gratitude',
}

// Jour civil dans le fuseau demandé (jamais toISOString().slice(0, 10)).
export function dayIn(createdAt, tz = 'Europe/Paris') {
  const raw = String(createdAt).trim()
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : raw.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function buildImportSql({ weights = [], netWorth = [], spiritual = [] }, userId, tz = 'Europe/Paris') {
  if (!UUID.test(userId)) throw new Error('--user doit être un uuid (Authentication > Users dans Supabase)')
  const u = q(userId)
  const out = ['begin;', `-- Import Routine Tracker pour ${userId}`]

  const w = weights.filter((r) => DAY.test(r.date) && num(r.weight_kg) !== null)
  if (w.length) {
    out.push(`insert into public.measurement (indicator_id, user_id, day, value)
select i.id, ${u}, v.day::date, v.value
  from (values ${w.map((r) => `(${q(r.date)}, ${num(r.weight_kg)})`).join(', ')}) as v(day, value)
  join public.indicator i on i.user_id = ${u} and i.key = 'poids'
on conflict (indicator_id, day) do update set value = excluded.value;`)
  }

  const n = netWorth.filter((r) => DAY.test(r.date) && num(r.total_eur) !== null)
  if (n.length) {
    // Maximum 3 indicateurs actifs par domaine : le patrimoine remplace la générosité.
    out.push(`update public.indicator set is_active = false where user_id = ${u} and key = 'generosite';
insert into public.indicator (user_id, domain_id, key, label, unit, direction, source, position)
select ${u}, d.id, 'patrimoine', 'Patrimoine net', '€', 'up', 'import', 3
  from public.domain d where d.user_id = ${u} and d.key = 'finances'
on conflict (user_id, key) do nothing;
insert into public.measurement (indicator_id, user_id, day, value)
select i.id, ${u}, v.day::date, v.value
  from (values ${n.map((r) => `(${q(r.date)}, ${num(r.total_eur)})`).join(', ')}) as v(day, value)
  join public.indicator i on i.user_id = ${u} and i.key = 'patrimoine'
on conflict (indicator_id, day) do update set value = excluded.value;`)
  }

  const rows = []
  for (const r of spiritual) {
    const day = dayIn(r.created_at, tz)
    const content = String(r.content ?? '').trim()
    if (!day || !content) continue
    let body = `${TYPES[r.type] ?? 'Note'} — ${content}`
    if (r.reference) body += ` (${String(r.reference).trim()})`
    if (r.answered) body += ' (exaucée)'
    rows.push(`(${q(day)}, ${q(body)})`)
  }
  if (rows.length) {
    out.push(`insert into public.journal_entry (user_id, day, domain_id, body)
select ${u}, v.day::date, d.id, v.body
  from (values ${rows.join(',\n    ')}) as v(day, body)
  join public.domain d on d.user_id = ${u} and d.key = 'spiritualite'
 where not exists (
   select 1 from public.journal_entry j
    where j.user_id = ${u} and j.day = v.day::date and j.body = v.body);`)
  }
  out.push('commit;')
  return out.join('\n') + '\n'
}

async function main() {
  const a = process.argv.slice(2)
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d)
  if (opt('--fixture')) {
    const data = JSON.parse(readFileSync(opt('--fixture'), 'utf8'))
    return void process.stdout.write(buildImportSql(data, opt('--user', ''), opt('--tz', 'Europe/Paris')))
  }
  const api = opt('--api', 'http://localhost:8787')
  const headers = opt('--token') ? { 'x-access-token': opt('--token') } : {}
  const get = async (p) => {
    const r = await fetch(api + p, { headers })
    if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`)
    return r.json()
  }
  const [weights, netWorth, spiritual] = await Promise.all([
    get('/api/body-metrics'), get('/api/net-worth'), get('/api/spiritual'),
  ])
  process.stdout.write(buildImportSql({ weights, netWorth, spiritual }, opt('--user', ''), opt('--tz', 'Europe/Paris')))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => { console.error(e.message); process.exit(1) })
}
