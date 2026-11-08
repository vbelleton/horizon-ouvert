import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
// @ts-expect-error module .mjs sans types
import { buildImportSql, dayIn } from '../../scripts/import-routine-tracker.mjs'

const data = JSON.parse(readFileSync('tests/fixtures/routine-tracker.json', 'utf8'))
const USER = '00000000-0000-0000-0000-00000000000a'

test('le jour du journal est celui de Paris, pas celui d\'UTC', () => {
  expect(dayIn('2026-10-05 22:30:00', 'Europe/Paris')).toBe('2026-10-06')
  expect(dayIn('2026-10-06 08:00:00', 'Europe/Paris')).toBe('2026-10-06')
})

test('le SQL échappe les apostrophes et couvre les trois sources', () => {
  const sql = buildImportSql(data, USER)
  expect(sql).toContain("l''église d''Aix")
  expect(sql).toContain("'poids'")
  expect(sql).toContain("'patrimoine'")
  expect(sql).toContain('(exaucée)')
  expect(sql).toContain('on conflict (indicator_id, day) do update')
})

test('refuse un identifiant qui n\'est pas un uuid', () => {
  expect(() => buildImportSql(data, "x'; drop table a;--")).toThrow()
})

test('ne génère rien pour des données vides', () => {
  expect(buildImportSql({}, USER)).not.toContain('insert')
})
