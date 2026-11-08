import { expect, test } from '@playwright/test'
import { handler, makeDb } from './mock-supabase'

// Parcours complet d'une personne : check-in, revue, proches, domaine, journal.
// Fuseau Europe/Paris : le jour envoyé à la base doit être celui de Paris.
test.use({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', hasTouch: true })

const parisToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })

test('parcours complet', async ({ page, context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('sb-supabase-auth-token', JSON.stringify({
      access_token: 'x', refresh_token: 'y', token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'u', aud: 'authenticated', email: 'v@example.org', app_metadata: {}, user_metadata: {}, created_at: '2026-11-07' },
    }))
  })
  const db = makeDb()
  const log: string[] = []
  await context.route('http://supabase.test/**', handler(db, log))
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))

  // Horizon : le pouls de la dernière revue alimente les tuiles
  await page.goto('/app')
  await expect(page.getByText('Check-in du jour').first()).toBeVisible()
  await expect(page.getByText('Pouls : 5 sur 5')).toHaveCount(1)
  await expect(page.getByText('Maman attend de tes nouvelles')).toBeVisible()

  // Check-in
  await page.getByRole('button', { name: /Check-in du jour/ }).first().click()
  await page.getByRole('button', { name: 'Énergie : 4 sur 5' }).click()
  await page.getByRole('button', { name: 'Paix intérieure : 3 sur 5' }).click()
  await page.getByRole('button', { name: 'Une demi-heure de plus' }).click()
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.getByText('Check-in du jour fait')).toBeVisible()
  const sent = JSON.parse(log.find((l) => l.startsWith('POST checkin'))!.replace('POST checkin ', ''))
  expect(sent).toMatchObject({ energy: 4, peace: 3, sleep_hours: 7.5, day: parisToday() })

  // Revue en 5 étapes
  await page.goto('/app/revue')
  await expect(page.getByRole('heading', { name: 'La semaine' })).toBeVisible()
  await expect(page.getByText('Appeler Maman et finir le dossier.')).toBeVisible() // le cap de la semaine d'avant
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('textbox').fill('Un dîner en famille.')
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('button', { name: 'Pouls de Santé : 4 sur 5' }).click()
  await page.getByRole('button', { name: 'Pouls de Temps : 2 sur 5' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('Une préoccupation qui revient').fill('Trop d’engagements.')
  await page.getByRole('button', { name: 'Oui', exact: true }).first().click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByLabel('Le cap de la semaine qui vient').fill('Laisser un projet de côté.')
  await page.getByRole('button', { name: 'Temps', exact: true }).click()
  await page.getByRole('button', { name: 'Terminer la revue' }).click()
  await expect(page.getByText('Revue terminée').first()).toBeVisible()
  const done = db.review!.find((r) => r.completed_at && !['r1', 'r2'].includes(r.id))
  expect(done).toMatchObject({ focus_next: 'Laisser un projet de côté.', concerns: 'Trop d’engagements.', family_time: true })
  expect(db.domain_pulse!.some((p) => p.review_id === done!.id && p.domain_id === 'd-sante' && p.score === 4)).toBe(true)
  expect(db.profile![0].focus_domains).toContain('temps')

  // Proches : le plus en retard en premier, un tap note le contact
  await page.goto('/app/proches')
  await expect(page.locator('.person strong').first()).toHaveText('Maman')
  await page.getByRole('button', { name: 'J’ai pris des nouvelles' }).first().click()
  await expect(page.getByText('✓ Noté')).toBeVisible()
  expect(log.some((l) => l.startsWith('POST interaction'))).toBe(true)

  // Domaine : le plafond d'engagements est signalé, on ajoute un engagement
  await page.goto('/app/domaine/responsabilites')
  await expect(page.getByText('4 engagements actifs pour un plafond de 3')).toBeVisible()
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await page.getByPlaceholder(/Conseil de l’église/).fill('Atelier du jeudi')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).last().click()
  await expect(page.getByText('Atelier du jeudi')).toBeVisible()

  // Journal : une note depuis le bouton « + »
  await page.goto('/app/journal')
  await page.getByRole('button', { name: /Ajouter : check-in/ }).click()
  await page.getByRole('button', { name: /Une note/ }).click()
  await page.getByRole('textbox').first().fill('Garder le cap, sans me presser.')
  await page.getByRole('button', { name: 'Garder' }).click()
  await expect(page.getByText('Garder le cap, sans me presser.')).toBeVisible()

  // Connexions : créer le jeton santé, le voir une fois, puis couper
  await page.goto('/app')
  await page.getByRole('link', { name: /Connexions/ }).click()
  await expect(page.getByText('Pas encore connectée.')).toBeVisible()
  await page.getByRole('button', { name: 'Créer mon jeton' }).click()
  await expect(page.getByText('Copie ton jeton maintenant')).toBeVisible()
  await expect(page.getByText(/"p_token": "ho_testtoken"/)).toBeVisible()
  await expect(page.getByText('http://supabase.test/rest/v1/rpc/ingest_health')).toBeVisible()
  await expect(page.getByText(/Connexion active depuis le/)).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Couper la connexion' }).click()
  await expect(page.getByText('Pas encore connectée.')).toBeVisible()

  expect(errors).toEqual([])
})

test('sans session, /app renvoie à la connexion', async ({ page }) => {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(page.getByRole('button', { name: 'Recevoir mon lien' })).toBeVisible()
})
