/**
 * Dates calendaires d'Horizon Ouvert.
 *
 * Règle : un jour est une chaîne « AAAA-MM-JJ » dans le fuseau de la personne,
 * stockée en `date` Postgres. Jamais `toISOString().slice(0, 10)` : en France,
 * le soir, cela donne le jour suivant (UTC) ou, sur une date construite à
 * minuit local, la veille. Le piège a déjà cassé Cieux Ouverts et
 * Routine Tracker.
 */

export type IsoDay = string

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** Jour calendaire de `date` dans le fuseau `timeZone` (par défaut celui du navigateur). */
export function isoDay(date: Date = new Date(), timeZone?: string): IsoDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function assertDay(day: IsoDay): void {
  if (!ISO_DAY.test(day)) throw new Error(`Jour invalide : ${day}`)
}

/** Ajoute `n` jours à un jour calendaire, sans passer par un fuseau. */
export function addDays(day: IsoDay, n: number): IsoDay {
  assertDay(day)
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10) // sûr ici : la date est construite en UTC
}

/** Jour de la semaine, 0 = dimanche … 6 = samedi. */
export function weekday(day: IsoDay): number {
  assertDay(day)
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Premier jour de la semaine contenant `day` (lundi par défaut). */
export function weekStart(day: IsoDay, startsOn: 0 | 1 = 1): IsoDay {
  const offset = (weekday(day) - startsOn + 7) % 7
  return addDays(day, -offset)
}

/** Nombre de jours de `from` à `to` (positif si `to` est après). */
export function daysBetween(from: IsoDay, to: IsoDay): number {
  assertDay(from)
  assertDay(to)
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Un jour calendaire en toutes lettres, sans décalage de fuseau (« 7 novembre », « samedi 7 novembre »). */
export function formatDay(day: IsoDay, withWeekday = false): string {
  assertDay(day)
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

/** « aujourd'hui », « hier », « il y a 12 jours »… */
export function relativeDays(n: number): string {
  if (n <= 0) return 'aujourd’hui'
  if (n === 1) return 'hier'
  if (n < 14) return `il y a ${n} jours`
  if (n < 60) return `il y a ${Math.round(n / 7)} semaines`
  return `il y a ${Math.round(n / 30)} mois`
}
