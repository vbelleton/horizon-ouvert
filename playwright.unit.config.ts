import { defineConfig } from '@playwright/test'

// Tests unitaires sans navigateur, lancés en fuseau Europe/Paris
// (voir le script test:unit) pour attraper les décalages de date.
export default defineConfig({
  testDir: './tests/unit',
  reporter: 'list',
})
