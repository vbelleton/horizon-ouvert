import { expect, test } from '@playwright/test'
import { avg, daysSince, fmt, isDue, latestPulse, sortPeople, weekSummary, weekToReview } from '../../utils/review'

test('fmt écrit les nombres à la française', () => {
  expect(fmt(6.5)).toBe('6,5')
  expect(fmt(7)).toBe('7')
  expect(fmt(null)).toBe('–')
  expect(fmt(3.456, 2)).toBe('3,46')
})

test('avg ignore les valeurs absentes', () => {
  expect(avg([2, null, 4])).toBe(3)
  expect(avg([null, undefined])).toBeNull()
})

test('weekSummary ne compte que les 7 jours de la semaine', () => {
  const checkins = [
    { day: '2026-11-01', energy: 1, peace: 1, sleep_hours: 4 }, // dimanche d'avant
    { day: '2026-11-02', energy: 4, peace: 3, sleep_hours: 7 },
    { day: '2026-11-08', energy: 2, peace: 5, sleep_hours: null }, // dimanche : dernier jour
    { day: '2026-11-09', energy: 1, peace: 1, sleep_hours: 4 }, // semaine suivante
  ]
  const s = weekSummary(checkins, '2026-11-02')
  expect(s.count).toBe(2)
  expect(s.energy).toBe(3)
  expect(s.peace).toBe(4)
  expect(s.sleep).toBe(7)
})

test('latestPulse garde le pouls de la revue la plus récente', () => {
  const p = latestPulse([
    { domain_id: 'a', score: 2, week_start: '2026-10-19' },
    { domain_id: 'a', score: 4, week_start: '2026-10-26' },
    { domain_id: 'a', score: null, week_start: '2026-11-02' }, // pas de pouls : on garde le précédent
    { domain_id: 'b', score: 3, week_start: '2026-10-19' },
  ])
  expect(p).toEqual({ a: 4, b: 3 })
})

test('le lundi, une semaine précédente non terminée est proposée', () => {
  expect(weekToReview('2026-11-09', '2026-11-09', [])).toBe('2026-11-02')
  expect(weekToReview('2026-11-09', '2026-11-09', ['2026-11-02'])).toBe('2026-11-09')
  expect(weekToReview('2026-11-12', '2026-11-09', [])).toBe('2026-11-09')
})

test('isDue et daysSince', () => {
  expect(daysSince('2026-11-01', '2026-11-08')).toBe(7)
  expect(daysSince(null, '2026-11-08')).toBeNull()
  expect(isDue({ cadence_days: 7, last_contact_on: '2026-11-01' }, '2026-11-08')).toBe(false)
  expect(isDue({ cadence_days: 7, last_contact_on: '2026-10-31' }, '2026-11-08')).toBe(true)
  expect(isDue({ cadence_days: 7, last_contact_on: null }, '2026-11-08')).toBe(true)
  expect(isDue({ cadence_days: null, last_contact_on: null }, '2026-11-08')).toBe(false)
})

test('sortPeople met les plus en retard en tête, puis le cercle', () => {
  const today = '2026-11-08'
  const sorted = sortPeople(
    [
      { name: 'Zoé', circle: 'communaute', cadence_days: null, last_contact_on: null },
      { name: 'Paul', circle: 'proche', cadence_days: 14, last_contact_on: '2026-10-20' }, // 19 j, en retard de 5
      { name: 'Maman', circle: 'intime', cadence_days: 7, last_contact_on: '2026-10-30' }, // 9 j, en retard de 2
      { name: 'Luc', circle: 'intime', cadence_days: 30, last_contact_on: '2026-11-05' }, // à jour
    ],
    today,
  )
  expect(sorted.map((p) => p.name)).toEqual(['Paul', 'Maman', 'Luc', 'Zoé'])
})
