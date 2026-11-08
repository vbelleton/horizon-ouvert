import { defineConfig } from '@playwright/test'

// Tests de bout en bout : l'app construite pour Node (npm run build:e2e) et un
// faux Supabase en mémoire (tests/e2e/mock-supabase.ts), sans réseau.
export default defineConfig({
  testDir: './tests/e2e',
  reporter: 'list',
  retries: 0,
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    // PW_CHROMIUM_PATH : utile quand le navigateur installé n'est pas celui de cette version de Playwright.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    env: {
      PORT: '3100',
      NUXT_PUBLIC_SUPABASE_URL: 'http://supabase.test',
      NUXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    },
  },
})
