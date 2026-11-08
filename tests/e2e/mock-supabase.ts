// Faux PostgREST en mémoire : assez pour parcourir toute l'app sans vrai
// Supabase. Il ne remplace PAS les tests SQL (npm run test:db), qui vérifient
// la RLS : il vérifie que l'interface lit et écrit ce qu'il faut, au bon jour.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Route } from '@playwright/test'

const colors = ['#6f9a7e','#c98b6b','#7f8fa8','#b9a46a','#8a7fa3','#5f9aa3','#a3866a'];
const keys = ['sante','relations','finances','temps','responsabilites','croissance','spiritualite'];
const labels = ['Santé','Relations','Finances','Temps','Responsabilités','Croissance','Vie spirituelle'];
let n = 100; const id = (p: string) => `${p}-${++n}`;
function iso(offset: number): string { const d = new Date(Date.now() + offset * 864e5); return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }); }
function monday(offset = 0): string { const t = iso(offset); const d = new Date(t + 'T12:00:00Z'); const w = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - w); return d.toISOString().slice(0, 10); }
export const makeDb = (): Record<string, any[]> => {
  const db = {
    profile: [{ user_id: 'u', display_name: 'Victor', timezone: 'Europe/Paris', week_starts_on: 1, review_weekday: 0, max_active_commitments: 3, focus_domains: ['relations', 'spiritualite'] }],
    domain: keys.map((k, i) => ({ id: 'd-' + k, user_id: 'u', key: k, label: labels[i], color: colors[i], position: i + 1, is_active: true })),
    checkin: [1, 2, 3].map((g) => ({ id: id('c'), user_id: 'u', day: iso(-g), energy: 3, peace: 4, sleep_hours: 6, gratitude: null, note: null })),
    review: [
      { id: 'r1', user_id: 'u', week_start: monday(-14), completed_at: '2026-10-25T18:00:00Z' },
      { id: 'r2', user_id: 'u', week_start: monday(-7), completed_at: '2026-11-01T18:00:00Z', focus_next: 'Appeler Maman et finir le dossier.' },
    ],
    domain_pulse: [
      ...keys.map((k, i) => ({ review_id: 'r1', domain_id: 'd-' + k, user_id: 'u', score: [3, 4, 3, 2, 3, 4, 4][i], word: null, hours_estimate: null })),
      ...keys.map((k, i) => ({ review_id: 'r2', domain_id: 'd-' + k, user_id: 'u', score: [4, 3, 3, 2, 2, 4, 5][i], word: k === 'temps' ? 'serré' : null, hours_estimate: null })),
    ],
    person: [
      { id: 'p1', user_id: 'u', name: 'Maman', circle: 'intime', cadence_days: 7, last_contact_on: iso(-12), note: null },
      { id: 'p2', user_id: 'u', name: 'Paul', circle: 'proche', cadence_days: 30, last_contact_on: iso(-9), note: null },
      { id: 'p3', user_id: 'u', name: 'Sophie', circle: 'intime', cadence_days: 14, last_contact_on: iso(-3), note: null },
    ],
    interaction: [], journal_entry: [],
    commitment: [
      { id: 'k1', user_id: 'u', domain_id: 'd-responsabilites', title: 'Conseil de l’église', kind: 'responsabilite', status: 'actif', next_step: 'Préparer l’ordre du jour', review_on: null, note: null },
      { id: 'k2', user_id: 'u', domain_id: 'd-responsabilites', title: 'Association Bras Ouverts', kind: 'projet', status: 'actif', next_step: null, review_on: null, note: null },
      { id: 'k3', user_id: 'u', domain_id: 'd-responsabilites', title: 'Site de Kap’Itou', kind: 'projet', status: 'actif', next_step: 'Relire les textes', review_on: null, note: null },
      { id: 'k4', user_id: 'u', domain_id: 'd-responsabilites', title: 'Refonte du site paroissial', kind: 'projet', status: 'actif', next_step: 'Choisir un hébergeur', review_on: null, note: null },
    ],
    indicator: [
      { id: 'i1', user_id: 'u', domain_id: 'd-sante', key: 'activite_physique', label: 'Activité physique', unit: 'séances / sem.', direction: 'up', target: 3, target_max: null, source: 'manual', is_active: true, position: 1 },
      { id: 'i2', user_id: 'u', domain_id: 'd-sante', key: 'poids', label: 'Poids', unit: 'kg', direction: 'range', target: null, target_max: null, source: 'import', is_active: true, position: 2 },
    ],
    measurement: [{ indicator_id: 'i2', user_id: 'u', day: iso(-2), value: 78.4, note: null }],
  };
  return db;
};
const signals = (): any[] => [
  { user_id: 'u', domain_key: 'relations', level: 'attention', rule: 'proches_intimes', message: 'Maman attend de tes nouvelles' },
  { user_id: 'u', domain_key: 'responsabilites', level: 'attention', rule: 'trop_engagements', message: '4 engagements actifs pour un plafond de 3' },
  { user_id: 'u', domain_key: 'responsabilites', level: 'info', rule: 'sans_prochaine_etape', message: '1 engagement sans prochaine étape' },
];
function matches(row: any, k: string, v: string): boolean {
  const [op, ...rest] = v.split('.'); const val = rest.join('.');
  if (op === 'eq') return String(row[k]) === val;
  if (op === 'gte') return String(row[k]) >= val;
  if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map((s) => s.replace(/"/g, '')).includes(String(row[k]));
  if (op === 'not') return rest[0] === 'is' && rest[1] === 'null' ? row[k] != null : true;
  return true;
}
export const handler = (db: Record<string, any[]>, log: string[]) => async (route: Route) => {
  const req = route.request(); const url = new URL(req.url()); const m = url.pathname.match(/\/rest\/v1\/(\w+)/);
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (!m) return route.fulfill({ status: 200, headers, body: '{}' });
  const t = m[1]; const single = (req.headers()['accept'] || '').includes('pgrst.object');
  const send = (rows: any[], status = 200) => route.fulfill({ status, headers, body: JSON.stringify(single ? (rows[0] ?? null) : rows) });
  if (t === 'signals') return send(signals());
  const table = db[t]; if (!table) return route.fulfill({ status: 404, headers, body: JSON.stringify({ message: 'no table ' + t }) });
  if (req.method() === 'GET') {
    let rows = table.filter((r) => [...url.searchParams].every(([k, v]) => ['select', 'order', 'limit', 'on_conflict'].includes(k) || matches(r, k, v)));
    const order = url.searchParams.get('order'); if (order) { const [col, dir] = order.split(',')[0].split('.'); rows = [...rows].sort((a: any, b: any) => (String(a[col]) < String(b[col]) ? -1 : 1) * (dir === 'desc' ? -1 : 1)); }
    const limit = url.searchParams.get('limit'); if (limit) rows = rows.slice(0, Number(limit));
    return send(rows);
  }
  const body = req.postDataJSON();
  if (req.method() === 'POST') {
    const conflict = url.searchParams.get('on_conflict'); const out: any[] = [];
    for (const input of ([] as any[]).concat(body)) {
      const cols = conflict ? conflict.split(',') : null;
      const existing = cols && table.find((r) => cols.every((c) => String(r[c]) === String(input[c])));
      if (existing) { Object.assign(existing, input); out.push(existing); } else { const row = { id: id(t[0]), ...input }; table.push(row); out.push(row); }
    }
    log.push(`POST ${t} ${JSON.stringify(body)}`);
    return send(out, 201);
  }
  if (req.method() === 'PATCH') {
    const rows = table.filter((r) => [...url.searchParams].every(([k, v]) => matches(r, k, v))); rows.forEach((r) => Object.assign(r, body));
    log.push(`PATCH ${t} ${JSON.stringify(body)}`); return send(rows);
  }
  if (req.method() === 'DELETE') {
    const rows = table.filter((r) => [...url.searchParams].every(([k, v]) => matches(r, k, v))); rows.forEach((r) => table.splice(table.indexOf(r), 1));
    log.push(`DELETE ${t}`); return send(rows);
  }
  return route.fulfill({ status: 405, headers, body: '{}' });
};
