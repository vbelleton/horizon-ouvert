import { expect, test } from '@playwright/test'
import { addDays, daysBetween, isoDay, weekStart, weekday } from '../../utils/dates'

test('le fuseau de test est bien Europe/Paris', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Europe/Paris')
})

test('un check-in à 23h30 à Paris compte pour le jour même', () => {
  // 23h30 heure de Paris le 7 novembre = 22h30 UTC
  const soir = new Date('2026-11-07T22:30:00Z')
  expect(isoDay(soir, 'Europe/Paris')).toBe('2026-11-07')
  expect(isoDay(soir)).toBe('2026-11-07')
})

test('minuit et demi à Paris compte pour le nouveau jour', () => {
  // 00h30 heure de Paris le 8 novembre = 23h30 UTC le 7
  const nuit = new Date('2026-11-07T23:30:00Z')
  expect(isoDay(nuit, 'Europe/Paris')).toBe('2026-11-08')
  // le piège : la version UTC donnerait la veille
  expect(nuit.toISOString().slice(0, 10)).toBe('2026-11-07')
})

test('une date construite à minuit local garde son jour', () => {
  expect(isoDay(new Date('2026-03-29T00:00:00'))).toBe('2026-03-29')
})

test('addDays traverse les changements d’heure et les mois', () => {
  expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  expect(addDays('2026-03-29', 1)).toBe('2026-03-30')
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
})

test('weekStart renvoie le lundi par défaut, ou le dimanche', () => {
  expect(weekday('2026-11-07')).toBe(6) // samedi
  expect(weekStart('2026-11-07')).toBe('2026-11-02')
  expect(weekStart('2026-11-02')).toBe('2026-11-02')
  expect(weekStart('2026-11-08')).toBe('2026-11-02') // dimanche
  expect(weekStart('2026-11-07', 0)).toBe('2026-11-01')
})

test('daysBetween compte en jours calendaires', () => {
  expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7)
  expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7)
})

test('un jour mal formé est refusé', () => {
  expect(() => addDays('7/11/2026', 1)).toThrow()
})
