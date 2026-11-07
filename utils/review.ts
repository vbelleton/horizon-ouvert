import { addDays, daysBetween, type IsoDay } from './dates'

/** Nombre à la française : « 6,5 », ou « – » quand il n'y a rien à montrer. */
export function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '–'
  return n.toFixed(digits).replace('.', ',').replace(/,0+$/, '')
}

export function avg(values: Array<number | null | undefined>): number | null {
  const v = values.filter((x): x is number => typeof x === 'number')
  if (!v.length) return null
  return v.reduce((a, b) => a + b, 0) / v.length
}

export interface CheckinLite {
  day: string
  energy: number | null
  peace: number | null
  sleep_hours: number | null
}

export interface WeekSummary {
  count: number
  energy: number | null
  peace: number | null
  sleep: number | null
}

/** Résumé des check-ins de la semaine qui commence à `start` (7 jours). */
export function weekSummary(checkins: CheckinLite[], start: IsoDay): WeekSummary {
  const end = addDays(start, 6)
  const week = checkins.filter((c) => c.day >= start && c.day <= end)
  return {
    count: week.length,
    energy: avg(week.map((c) => c.energy)),
    peace: avg(week.map((c) => c.peace)),
    sleep: avg(week.map((c) => c.sleep_hours)),
  }
}

export interface PulseLite {
  domain_id: string
  score: number | null
  week_start: string
}

/** Dernier pouls connu par domaine (la revue terminée la plus récente qui en donne un). */
export function latestPulse(rows: PulseLite[]): Record<string, number> {
  const out: Record<string, { score: number; week: string }> = {}
  for (const r of rows) {
    if (r.score === null) continue
    const cur = out[r.domain_id]
    if (!cur || r.week_start > cur.week) out[r.domain_id] = { score: r.score, week: r.week_start }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.score]))
}

/**
 * Quelle semaine proposer à la revue ? La semaine en cours, sauf le premier
 * jour d'une nouvelle semaine si la précédente n'a pas été terminée : on
 * l'accueille sans reproche plutôt que de la sauter.
 */
export function weekToReview(today: IsoDay, thisWeek: IsoDay, completedWeeks: IsoDay[]): IsoDay {
  const previous = addDays(thisWeek, -7)
  if (today === thisWeek && !completedWeeks.includes(previous)) return previous
  return thisWeek
}

/** Jours écoulés depuis le dernier contact, ou null s'il n'y en a jamais eu. */
export function daysSince(lastContactOn: string | null, today: IsoDay): number | null {
  return lastContactOn ? daysBetween(lastContactOn, today) : null
}

export interface PersonLite {
  cadence_days: number | null
  last_contact_on: string | null
}

/** Un proche est « à recontacter » au-delà de sa cadence, ou s'il n'a jamais été contacté. */
export function isDue(p: PersonLite, today: IsoDay): boolean {
  if (!p.cadence_days) return false
  const d = daysSince(p.last_contact_on, today)
  return d === null || d > p.cadence_days
}

const CIRCLE_ORDER: Record<string, number> = { intime: 0, proche: 1, communaute: 2 }

/** À recontacter d'abord (le plus en retard en tête), puis par cercle, puis par nom. */
export function sortPeople<T extends PersonLite & { name: string; circle: string }>(people: T[], today: IsoDay): T[] {
  const late = (p: T) => (isDue(p, today) ? (daysSince(p.last_contact_on, today) ?? 9999) : -1)
  return [...people].sort((a, b) => {
    const da = late(a), db = late(b)
    if ((da >= 0) !== (db >= 0)) return da >= 0 ? -1 : 1
    if (da !== db) return db - da
    const ca = CIRCLE_ORDER[a.circle] ?? 9, cb = CIRCLE_ORDER[b.circle] ?? 9
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name, 'fr')
  })
}
